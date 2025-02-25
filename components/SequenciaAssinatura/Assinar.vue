<script setup>
import { defineProps, onMounted, ref } from 'vue';
import { toast } from 'vue3-toastify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { utcToZonedTime } from 'date-fns-tz';
import axios from '@/config/axios-config';
import './Assinar.scss';
import 'vue3-toastify/dist/index.css';

const props = defineProps(
        ["idProjeto"]
    );

const associados = ref('');
const statusCadeia = ref('');
const associadosOrdenados = ref([]);
const assinantes = ref('');
const usuarioAtual = ref('');
const nivelPermissao = ref('');
const idPermissao = ref('');

const incluirNaOrdem = (index) => {
    const usuario = associados.value[index];
    associados.value.splice(index, 1);
    associadosOrdenados.value.push(usuario);
}

const removerDaOrdem = (index) => {
    const usuario = associadosOrdenados.value[index];
    associadosOrdenados.value.splice(index, 1);
    associados.value.push(usuario);
}

const consultarStatusCadeia = () => {
    axios.get(`/cadeiaAssinatura/status?idProjeto=${props.idProjeto}`)
        .then((resposta) => {
            statusCadeia.value = resposta.data.status;
        })
        .catch((error) => {
            statusCadeia.value = '';
        });
}

const consultarVezDeAssinar = () => {
    axios.get(`/cadeiaAssinatura/posicao?idProjeto=${props.idProjeto}`)
        .then((resposta) => {
            assinantes.value = resposta.data
        })
        .catch((error) => {});
}

const consultarPermissao = () => {
    axios.get(`/perfil`)
      .then((resposta) => {
          usuarioAtual.value= resposta.data.usuario;
          axios.get(`/usuario/buscarPermissoes?idUsuario=${usuarioAtual.value.id}`)
              .then((resposta) => {
                  for (const permissao of resposta.data) {
                      if (permissao.idProjeto === props.idProjeto) {
                          idPermissao.value = permissao.idAssociado;
                          nivelPermissao.value = permissao.nivelPermissao;
                      }
                  }
              });
      })
      .catch((error) => {});
}

const consultarAssociadosProjeto = () => {
    axios.get(`projeto/usuarios?idProjeto=${props.idProjeto}&pageSize=1000`)
        .then((resposta) => {;
            associados.value = resposta.data.lista.filter(associado => !!associado.email.trim());
        })
        .catch((error) => {});
}

const iniciarCadeia = () => {
    const idAssociados = associadosOrdenados.value.map(
        associado => associado.id
    );
    axios.post('/cadeiaAssinatura/incluirAssociado',{
        'idProjeto': props.idProjeto,
        'idAssociados': idAssociados
    }).then( resposta => {
          toast.success("Sequência iniciada com sucesso!", {
              autoClose: 3000
          });
          setTimeout(() => {
              consultarStatusCadeia();
              consultarVezDeAssinar();
          }, 1000);
    }).catch((error) => {
          toast.error(error.response.data.message, {
              autoClose: 3000
          })
    });
}

const visualizar= () => {
    axios.get(`/cadeiaAssinatura/receberDocumento?idProjeto=${props.idProjeto}`)
          .then((resposta) => {
              window.open(resposta.data);
              setTimeout(() => {
                  consultarStatusCadeia();
                  consultarVezDeAssinar();
              }, 1000);
        }).catch((error) => {
              toast.error(error.response.data.message, {
                  autoClose: 3000
              })
        });
}

const excluir = () => {
    axios.delete(`/cadeiaAssinatura/excluirCadeia/${props.idProjeto}`)
        .then((resposta) => {
            toast.success("Sequência excluída com sucesso!", {
                autoClose: 3000
            });
            setTimeout(() => {
                consultarStatusCadeia();
                consultarVezDeAssinar();
            }, 1000);
        }).catch((error) => {
            toast.error(error.response.data.message, {
                autoClose: 3000
            })
        });
}

const selecionarDocumento = () => {
    const input = document.getElementById('input-documento');
    input.addEventListener('change', () => {
        const documento = input.files[0];
        if (documento) {
            const leitor = new FileReader();
            leitor.readAsDataURL(documento);
            leitor.onload = () => {
                const docAssPDF = leitor.result.split(',')[1];
                enviarDocumento(docAssPDF);
            };
        }
    });
    input.click();
}

const enviarDocumento = (docAssPDF) => {
    axios.post('/cadeiaAssinatura/enviarDocumento',{
        'idProjeto': props.idProjeto,
        'docAssPDF': docAssPDF
    }).then((resposta) => {
          toast.success("Documento enviado com sucesso!", {
              autoClose: 3000
          });
          setTimeout(() => {
              consultarStatusCadeia();
              consultarVezDeAssinar();
          }, 1000);
    }).catch((error) => {
          toast.error("Documento já enviado!", {
              autoClose: 3000
          })
    });
}

const tratarStatus = (usuario) => {
    if (usuario.idAssociadoAoProjeto === assinantes.value.idAtualAssinante) {
        return 'Atual Assinante';
    } else if (usuario.idAssociadoAoProjeto ===
                assinantes.value.idProximoAssinante) {
        return 'Próximo Assinante';
    } else if (usuario.assinou === false) {
        return 'Não Assinou';
    } else {
        return 'Assinou';
    }
}

const formatarData = (dataAssinatura) => {
    const data = new Date(dataAssinatura);
    const fusoHorario= 'America/Sao_Paulo';
    const dataFuso = utcToZonedTime(data, fusoHorario);
    return format(dataFuso, "dd/MM/yyyy", { locale: ptBR });
}

function alternarCssAssinatura(index, status) {
    if (status === 'Assinou') {
        return "verde";
    } else if (status === 'Atual Assinante') {
        return "vermelho";
    } else if (status === 'Próximo Assinante') {
        return "amarelo";
    } else {
      if (index % 2 === 0) {
          return "cinza-escuro";
        } else {
          return "cinza-claro";
        }
    }
}

function alternarCss(index) {
    if (index % 2 === 0) {
        return "cinza-escuro";
    } else {
        return "cinza-claro";
    }
}

onMounted(() => {
    consultarAssociadosProjeto();
    consultarStatusCadeia();
    consultarVezDeAssinar();
    consultarPermissao();
});
</script>

<template>
    <div style="display:flex; justify-content: center; align-items: center;">
        <div class="tooltip-container">
            <i class="fas fa-info-circle tooltip-icon"></i>
            <span class="tooltip-text">
                Aqui o documento de participação será assinado em uma ordem específica definida pelo Correspondente. <br>
                Cada Associado poderá baixar o documento quando for sua vez, devendo, em seguida, assinar e enviar de volta para o sistema. <br>
                A sequência seguirá após a validação do documento pelo Correspondente.
            </span>
        </div>
        <h1>Sequência de Assinaturas</h1>
    </div>
    <div v-if="nivelPermissao === 'Correspondente'" class="assinatura-correspondente">
        <div class="div-table-lista">
            <div v-if="statusCadeia === ''">
                <p>A sequência ainda não foi iniciada.</p>
                <p style="padding-bottom: 1rem;">Clique em incluir em cada um dos associados para ordená-los.</p>
                <div v-if="associadosOrdenados.length !== 0">
                    <p>Usuários ordenadas:</p>
                    <div v-if="associados.length === 0"
                        style="display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 1rem;">
                        <button class="btn-principal" @click="iniciarCadeia()">
                            Iniciar Sequência de Assinaturas
                        </button>
                    </div>
                    <table v-if="associadosOrdenados.length !== 0" class="linha-table">
                        <tr>
                            <th class="text-center">Ordem</th>
                            <th class="text-center">Associado</th>
                            <th class="text-center">Ação</th>
                        </tr>
                        <tr v-for="(usuario, index) in associadosOrdenados" :class="['linha-table', alternarCss(index)]">
                            <td>{{ index + 1 + "º" }}</td>
                            <td>{{ usuario.nome }}</td>
                            <td class="botao-final">
                                <button class="btn-apagar" @click="removerDaOrdem(index)"
                                    :disabled="usuario.incluido">
                                    Remover
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <table v-if="associados.length !== 0" class="linha-table">
                    <tr>
                        <th class="text-center">Associado</th>
                        <th class="text-center">Ação</th>
                    </tr>
                    <tr v-for="(usuario, index) in associados" :class="['linha-table', alternarCss(index)]">
                        <td>{{ usuario.nome }}</td>
                        <td class="botao-final">
                            <button class="btn-principal" @click="incluirNaOrdem(index)"
                                :disabled="usuario.incluido">
                                Incluir
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div v-else>
                <div v-if="statusCadeia === 'Em Andamento'" >
                    <div style="display:flex; justify-content: center; align-items: center; padding-bottom: 1rem;">
                        <div class="tooltip-container">
                            <i class="fas fa-info-circle tooltip-icon"></i>
                            <span class="tooltip-text">
                                A sequência está em andamento. <br>
                                *Correspondentes devem aguardar a assinatura do atual assinante para assim validá-la, até o término da sequência. <br>
                                *Associados devem aguardar a sua vez para assinar o documento.
                            </span>
                        </div>
                        <p><i><b>Em Andamento</b></i></p>
                    </div>
                    <div v-if="idPermissao === assinantes.idAtualAssinante" class="enviar-documento">
                        <b>É a sua vez! Envie o documento assinado.</b>
                        <div style="display: flex; justify-content: center; align-items: center; padding-bottom: 1rem;">
                            <input type="file" id="input-documento" accept=".pdf" style="display: none;">
                            <div style="padding-right: 1rem;">
                                <button class="btn-principal" @click="visualizar()">
                                    Baixar Documento
                                </button>
                            </div>
                            <button class="btn-principal" @click="selecionarDocumento()">
                                Enviar Documento
                            </button>
                        </div>
                    </div>
                </div>
                <div v-if="statusCadeia === 'Encerrada'">
                    <p><i><b>Encerrada</b></i></p>
                    <p style="padding-bottom: 1rem;">É possível visualizar o documento final abaixo ou reiniciar a sequência excluindo-a.</p>
                </div>
                <table class="linha-table">
                    <tr>
                        <th class="text-center">Ordem</th>
                        <th class="text-center">Associado</th>
                        <th class="text-center">Status de Assinatura</th>
                        <th class="text-center">Data de Assinatura</th>
                        <th class="text-center">Documento</th>
                    </tr>
                    <tr v-if="statusCadeia === 'Em Andamento'" v-for="(usuario, index) in assinantes.associadosOrdem" :class="['linha-table', alternarCss(index)]">
                        <td>{{ index + 1 + "º" }}</td>
                        <td>{{ usuario.nome }}</td>
                        <td :class="alternarCssAssinatura(index, tratarStatus(usuario))" style="color: black;">{{ tratarStatus(usuario) }}</td>
                        <td>{{ usuario.dataDeAssinatura ? formatarData(usuario.dataDeAssinatura) : '-' }}</td>
                        <td>
                          <div v-if="usuario.idAssociadoAoProjeto === assinantes.idAtualAssinante"  class="visualizar-documento">
                                <div class="botao-visualizar-doc">
                                    <a href="#" class="btn-visualizar-doc" @click="visualizar()">
                                        <v-icon class="icon-circle document-icon">mdi-eye</v-icon>
                                    </a>
                                </div>
                            </div>
                            <div v-else>-</div>
                        </td>
                    </tr>
                    <tr v-else-if="statusCadeia === 'Encerrada'" v-for="(usuario, index) in assinantes.associadosOrdem" :class="['linha-table', alternarCss(index)]">
                        <td>{{ index + 1 + "º" }}</td>
                        <td>{{ usuario.nome }}</td>
                        <td :class="alternarCssAssinatura(index, tratarStatus(usuario))" style="color: black;">{{ tratarStatus(usuario) }}</td>
                        <td>{{ usuario.dataDeAssinatura ? formatarData(usuario.dataDeAssinatura) : '-' }}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                </table>
            </div>
            <div style="display: flex; flex-direction: row;">
                <button v-if="statusCadeia ==='Encerrada'" class="btn-principal" @click="visualizar()">
                    Visualizar Documento
                </button>
                <button v-if="statusCadeia === 'Em Andamento' || statusCadeia ==='Encerrada'" class="btn-deletar-sequencia" @click="excluir()">
                    Excluir Sequência
                </button>
            </div>
        </div>
      </div>
      <div v-else class="assinatura-associados">
          <div v-if="statusCadeia === ''">
              <p>A sequência ainda não foi iniciada. Aguarde o correspondente.</p>
          </div>
          <div v-if="statusCadeia === 'Em Andamento'">
              <div style="display:flex; justify-content: center; align-items: center; padding-bottom: 1rem;">
                  <div class="tooltip-container">
                      <i class="fas fa-info-circle tooltip-icon"></i>
                      <span class="tooltip-text">
                          A sequência está em andamento. <br>
                          *Correspondentes devem aguardar a assinatura do atual assinante para assim validá-la, até o término da sequência. <br>
                          *Associados devem aguardar a sua vez para assinar o documento.
                      </span>
                  </div>
                  <p><i><b>Em Andamento</b></i></p>
              </div>
              <div v-if="idPermissao === assinantes.idAtualAssinante" class="enviar-documento">
                  <b>É a sua vez! Envie o documento assinado.</b>
                  <div style="display: flex; justify-content: center; align-items: center; padding-bottom: 1rem;">
                      <input type="file" id="input-documento" accept=".pdf" style="display: none;">
                      <div style="padding-right: 1rem;">
                          <button class="btn-principal" @click="visualizar()">
                              Baixar Documento
                          </button>
                      </div>
                      <button class="btn-principal" @click="selecionarDocumento()">
                          Enviar Documento
                      </button>
                  </div>
              </div>
          </div>
          <div v-if="statusCadeia === 'Encerrada'">
              <p><i><b>Encerrada</b></i></p>
              <p style="padding-bottom: 1rem;">Sequência de Assinatura encerrada. Visualize o documento final abaixo.</p>
          </div>
          <table v-if="statusCadeia === 'Em Andamento' || statusCadeia === 'Encerrada'" class="linha-table">
              <tr>
                  <th class="text-center">Ordem</th>
                  <th class="text-center">Associado</th>
                  <th class="text-center">Status de Assinatura</th>
                  <th class="text-center">Data de Assinatura</th>
              </tr>
              <tr v-if="statusCadeia === 'Em Andamento'" v-for="(usuario, index) in assinantes.associadosOrdem" :class="['linha-table', alternarCss(index)]">
                  <td>{{ index + 1 + "º" }}</td>
                  <td>{{ usuario.nome }}</td>
                  <td :class="alternarCssAssinatura(index, tratarStatus(usuario))" style="color: black;">{{ tratarStatus(usuario) }}</td>
                  <td>{{ usuario.dataDeAssinatura ? formatarData(usuario.dataDeAssinatura) : '-' }}</td>
              </tr>
              <tr v-else-if="statusCadeia === 'Encerrada'" v-for="(usuario, index) in assinantes.associadosOrdem" :class="['linha-table', alternarCss(index)]">
                  <td>{{ index + 1 + "º" }}</td>
                  <td>{{ usuario.nome }}</td>
                  <td :class="alternarCssAssinatura(index, tratarStatus(usuario))" style="color: black;">{{ tratarStatus(usuario) }}</td>
                  <td>{{ usuario.dataDeAssinatura ? formatarData(usuario.dataDeAssinatura) : '-' }}</td>
              </tr>
          </table>
          <div style="display: flex; flex-direction: row;">
              <button v-if="statusCadeia ==='Encerrada'" class="btn-principal" @click="visualizar()">
                  Visualizar Documento
              </button>
          </div>
      </div>
</template>
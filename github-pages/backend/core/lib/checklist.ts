import type {Item} from "./model";

export const checklistCategories=[
 {id:"planejamento",label:"Planejamento",description:"As decisões que dão direção a todo o resto."},
 {id:"cerimonia",label:"Civil e cerimônia",description:"A celebração, a fé e os preparativos do civil."},
 {id:"noiva",label:"Noiva",description:"Vestido, beleza e os detalhes da Suelaine."},
 {id:"noivo",label:"Noivo",description:"Traje e os preparativos do Wesley."},
 {id:"decoracao",label:"Decoração e flores",description:"Os espaços, as cores e a atmosfera do grande dia."},
 {id:"recepcao",label:"Recepção e buffet",description:"Comida, estrutura e acolhimento dos convidados."},
 {id:"registros",label:"Foto, vídeo e música",description:"A trilha sonora e as memórias que vão ficar."},
 {id:"convidados",label:"Convidados e papelaria",description:"Quem vai celebrar com vocês e como receber cada pessoa."},
 {id:"logistica",label:"Logística e grande dia",description:"Os horários e os cuidados para tudo acontecer com tranquilidade."},
 {id:"depois",label:"Depois do sim",description:"O descanso e os detalhes que ficam para depois da festa."},
 {id:"outros",label:"Do nosso jeito",description:"Tudo o que é especial para vocês dois."},
] as const;
export const checklistStages=[{id:"todo",label:"Pendente"},{id:"doing",label:"Em andamento"},{id:"done",label:"Concluído"},{id:"not-needed",label:"Não vamos precisar"}] as const;
export type ChecklistCategory=typeof checklistCategories[number]["id"];
export type ChecklistStatus=typeof checklistStages[number]["id"];
export type ChecklistItem=Item&{collection:"weddingChecklist";title:string;category:ChecklistCategory;status:ChecklistStatus;person:string;date:string;note:string;optional:boolean};
type Seed=[string,string,string,boolean?];
const groups:Record<Exclude<ChecklistCategory,"outros">,Seed[]>={
 planejamento:[
  ["estilo","Definir o estilo e as prioridades","Conversem sobre o tamanho, o clima e o que é indispensável para os dois."],
  ["orcamento","Definir o orçamento total","Combinem o limite e uma reserva para imprevistos na aba de controle financeiro."],
  ["poupanca","Combinar a contribuição de cada um","Definam o ritmo de poupança sem comprometer as despesas do dia a dia."],
  ["lista-base","Montar a primeira lista de convidados","Uma estimativa ajuda a comparar locais, buffet e decoração."],
  ["data-local","Confirmar a data e reservar os espaços","Confiram disponibilidade, capacidade, acesso e plano para chuva."],
  ["cronograma","Distribuir tarefas e prazos","Levem as ações com data para o cronograma e dividam as responsabilidades."],
  ["contratos","Revisar contratos e condições","Confiram entregas, horários, parcelas e cancelamento antes de contratar."],
  ["assessoria","Contratar assessoria ou cerimonial","Se fizer sentido para vocês, comparem escopo e apoio no dia.",true],
 ],
 cerimonia:[
  ["cartorio","Consultar o cartório sobre documentos e prazos","Confirmem diretamente no cartório os requisitos e datas para o casamento civil."],
  ["documentos","Separar os documentos solicitados","Organizem o que o cartório pedir e confiram a validade dos documentos."],
  ["civil","Agendar o casamento civil","Confirmem local, horário, testemunhas e custos com o cartório."],
  ["igreja","Alinhar a cerimônia com a igreja","Conversem sobre disponibilidade, preparação do casal e orientações da igreja."],
  ["celebrante","Confirmar quem conduzirá a cerimônia","Alinhem a participação do pastor ou celebrante e a duração prevista."],
  ["aliancas","Escolher as alianças","Confiram medidas, gravação, prazo de entrega e quem levará no dia."],
  ["roteiro","Definir entradas, votos e roteiro","Combinem participantes, músicas e o momento dos votos."],
  ["ensaio","Organizar o ensaio da cerimônia","Alinhem os movimentos com padrinhos, músicos e quem vai conduzir."],
 ],
 noiva:[
  ["vestido","Escolher o vestido de noiva","Anotem modelo, loja ou ateliê, ajustes e prazo de retirada."],
  ["provas","Agendar as provas e os ajustes","Reservem uma última prova com tempo para pequenos ajustes."],
  ["calcado","Escolher um calçado confortável","Provem com o vestido e considerem um par de apoio."],
  ["acessorios","Definir acessórios e véu","Escolham os detalhes que combinam com o vestido e com a Suelaine."],
  ["beleza","Reservar cabelo e maquiagem","Confirmem local, duração, profissionais e horários."],
  ["teste","Agendar teste de cabelo e maquiagem","Levem referências e confiram a combinação com os acessórios."],
  ["buque","Escolher o buquê","Incluam referências de tulipas, se combinarem com a escolha de vocês."],
  ["preparacao","Organizar o local e o kit da preparação","Separem roupa confortável, alimentação, água e os itens que serão fotografados."],
 ],
 noivo:[
  ["traje","Escolher o traje do noivo","Definam modelo, cor, compra ou aluguel e prazo de retirada."],
  ["ajustes","Fazer a prova e os ajustes do traje","Confiram o caimento com camisa, cinto e sapatos."],
  ["sapatos","Separar sapatos e acessórios","Incluam camisa, meias, gravata e os detalhes escolhidos pelo Wesley."],
  ["cuidados","Agendar cabelo e cuidados pessoais","Escolham um horário que não aperte a programação do dia."],
  ["preparacao","Organizar a preparação do noivo","Confirmem local, transporte e quem guardará os documentos e as alianças."],
 ],
 decoracao:[
  ["paleta","Fechar a paleta e as referências","Branco prateado, dourado e tons de lilás, roxo ou rosa: escolham a combinação final."],
  ["projeto","Definir o projeto de decoração","Guardem referências no álbum de casamento e alinhem o que está incluído no serviço."],
  ["cerimonia","Planejar altar e caminho da cerimônia","Confiram arranjos, assentos e circulação sem bloquear os acessos."],
  ["mesas","Definir mesas e arranjos dos convidados","Combinem quantidade, altura dos arranjos, toalhas e identificação."],
  ["bolo","Planejar a mesa do bolo e dos doces","Escolham fundo, peças, altura e disposição dos doces."],
  ["flores","Escolher flores e folhagens","Confirmem disponibilidade, substituições e cuidados com calor e transporte."],
  ["luz","Definir a iluminação dos ambientes","Alinhem iluminação decorativa, do jantar e da pista com os responsáveis."],
  ["placas","Preparar placas e sinalização","Indiquem recepção, mesas e acessos de forma fácil de ler."],
  ["cantinho","Montar um cantinho de fotos","Pode reunir detalhes da história de vocês, como o 132.",true],
 ],
 recepcao:[
  ["buffet","Escolher e contratar o buffet","Confiram menu, equipe, louças, tempo de serviço e número final de pessoas."],
  ["degustacao","Fazer a degustação e fechar o cardápio","Anotem preferências e opções para restrições alimentares."],
  ["bebidas","Definir bebidas, água e gelo","Confirmem quantidades, serviço e quem cuida da reposição."],
  ["bolo-doces","Escolher bolo e doces","Confiram sabores, tamanho, entrega e montagem."],
  ["mobiliario","Conferir mesas, cadeiras e utensílios","Registrem o que o espaço ou o buffet já fornece antes de alugar."],
  ["estrutura","Checar banheiros, acessos e estrutura","Confirmem limpeza, acessibilidade, energia e apoio no local."],
  ["equipe","Combinar alimentação dos profissionais","Confiram quais contratos incluem refeição e como será servida."],
  ["lembrancas","Escolher lembrancinhas","Definam quantidade, personalização e quem fará a distribuição.",true],
 ],
 registros:[
  ["fotografia","Contratar fotografia","Confiram horas de cobertura, equipe, entregas e prazo das fotos."],
  ["video","Contratar filmagem","Combinem cobertura, formato e prazo dos vídeos.",true],
  ["ensaio","Planejar um ensaio do casal","Escolham data, local, roupas e uma alternativa para chuva.",true],
  ["fotos","Montar a lista de fotos importantes","Incluam pessoas e detalhes que vocês querem registrar."],
  ["musicos","Definir os músicos da cerimônia","Combinem repertório, instrumentos, equipamento e ensaio."],
  ["festa","Escolher a música da recepção","Definam DJ, banda ou a estrutura escolhida e os horários de atuação."],
  ["playlist","Fechar a playlist dos momentos especiais","Incluam entradas, primeira dança e canções como Mirrors e Photograph."],
  ["som","Conferir som, microfones e energia","Organizem uma passagem de som e o responsável por cada equipamento."],
 ],
 convidados:[
  ["lista","Revisar a lista de convidados","Organizem famílias, acompanhantes e crianças na aba de convidados."],
  ["padrinhos","Convidar padrinhos e madrinhas","Alinhem participação, horário e orientações de traje."],
  ["convites","Preparar e enviar os convites","Confiram nomes, data, local, horário e forma de confirmação."],
  ["rsvp","Definir prazo e acompanhar o RSVP","Atualizem confirmações e organizem quem precisa receber um lembrete."],
  ["restricoes","Confirmar restrições alimentares","Repassem apenas as informações necessárias à equipe de alimentação."],
  ["mesas","Organizar a distribuição nas mesas","Considerem proximidade, mobilidade e acompanhantes."],
  ["papelaria","Revisar menus e identificações","Confiram a escrita e as quantidades antes da produção.",true],
 ],
 logistica:[
  ["roteiro-dia","Montar a programação do grande dia","Reúnam horários de preparação, montagem, cerimônia e recepção."],
  ["fornecedores","Confirmar entregas com os fornecedores","Reconfiram endereço, contato, chegada, montagem e retirada."],
  ["pagamentos","Conferir parcelas e saldos finais","Atualizem os pagamentos na aba financeira e guardem os comprovantes."],
  ["transporte","Organizar o transporte do casal","Definam trajetos, horários e quem ficará com bolsas e objetos pessoais."],
  ["apoio","Escolher pessoas de apoio no dia","Compartilhem contatos e decisões práticas para o casal aproveitar a celebração."],
  ["kit","Preparar um kit de emergência","Separem água, curativos, itens de higiene e pequenos reparos de roupa."],
  ["reserva","Combinar alternativas para imprevistos","Confirmem o plano para chuva, atraso e falha de equipamento."],
  ["conferencia","Fazer a última conferência","Reúnam documentos, alianças, trajes, acessórios e a programação."],
 ],
 depois:[
  ["descanso","Organizar onde descansar após a festa","Confirmem acesso, transporte e os itens para o dia seguinte."],
  ["lua-mel","Planejar a lua de mel","Escolham destino, datas e orçamento quando fizer sentido para vocês.",true],
  ["devolucoes","Programar a devolução dos itens alugados","Anotem responsáveis e prazos para trajes, peças e equipamentos."],
  ["entregas","Acompanhar a entrega das fotos e vídeos","Confiram os prazos combinados nos contratos."],
  ["agradecimentos","Agradecer a quem celebrou com vocês","Separem um momento para as mensagens e os registros do casal."],
 ],
};
export const WEDDING_CHECKLIST:ChecklistItem[]=Object.entries(groups).flatMap(([category,seeds])=>seeds.map(([key,title,note,optional])=>({id:`check-${category}-${key}`,collection:"weddingChecklist" as const,revision:0,title,category:category as ChecklistCategory,status:optional?"not-needed" as const:"todo" as const,person:"Nós",date:"",note,optional:!!optional})));
export function checklistTotals(items:Item[]){
 const all=items.filter(item=>item.collection==="weddingChecklist"),applicable=all.filter(item=>item.status!=="not-needed"),done=applicable.filter(item=>item.status==="done").length,doing=applicable.filter(item=>item.status==="doing").length;
 return {all:all.length,total:applicable.length,done,doing,pending:applicable.length-done-doing,excluded:all.length-applicable.length,percent:applicable.length?(done===applicable.length?100:Math.min(99,Math.round(done/applicable.length*100))):0};
}

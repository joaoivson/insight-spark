import LegalLayout from "./LegalLayout";

const CONTACT = "relacionamento@marketdash.com.br";

const PrivacyPolicy = () => (
  <LegalLayout title="Política de Privacidade" updatedAt="agosto de 2026">
    <p>
      Esta Política de Privacidade descreve como a <strong>ORQUESTRA IA - TRANSFORMANDO SOLUÇÕES LTDA</strong>{" "}
      (CNPJ 66.641.347/0001-21), operadora da plataforma <strong>MarketDash</strong>, coleta, utiliza, armazena e
      protege os dados pessoais dos usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei
      13.709/2018).
    </p>

    <h2>1. Dados que coletamos</h2>
    <ul>
      <li><strong>Cadastro:</strong> nome, e-mail e, quando aplicável, CPF/CNPJ, para criação e gestão da conta.</li>
      <li><strong>Dados de vendas/comissões:</strong> informações de pedidos e comissões de afiliado importadas pelo
        usuário (via upload de arquivo) ou sincronizadas de plataformas conectadas, como a Shopee.</li>
      <li><strong>Dados de anúncios (Meta/Facebook):</strong> quando o usuário conecta sua conta do Facebook, acessamos —
        somente da conta de anúncios autorizada — dados como nome da campanha, status, orçamento, gasto, cliques,
        impressões, CPC e CTR.</li>
      <li><strong>Dados de uso:</strong> registros técnicos necessários ao funcionamento e à segurança da plataforma.</li>
    </ul>

    <h2>2. Como utilizamos os dados</h2>
    <ul>
      <li>Gerar dashboards e relatórios de desempenho (faturamento, comissão, gasto, lucro, ROAS, CPA, CPC).</li>
      <li>Permitir que o próprio usuário <strong>pause/ative campanhas</strong> e <strong>ajuste o orçamento</strong> da
        sua conta de anúncios diretamente pelo MarketDash.</li>
      <li>Operar, manter e melhorar a plataforma e prestar suporte.</li>
    </ul>

    <h2>3. Integração com a Meta (Facebook)</h2>
    <p>
      A conexão com o Facebook é <strong>opcional</strong> e feita pelo próprio usuário via Login do Facebook. Utilizamos
      as permissões <strong>ads_read</strong> (leitura de campanhas e métricas) e <strong>ads_management</strong> (para
      executar, a pedido do usuário, ações como pausar/ativar campanhas e alterar orçamento). Acessamos apenas a conta de
      anúncios que o usuário selecionar e <strong>não compartilhamos nem vendemos</strong> esses dados a terceiros. O
      usuário pode revogar o acesso a qualquer momento, desconectando a integração no MarketDash ou nas configurações da
      sua conta do Facebook.
    </p>

    <h2>4. Compartilhamento de dados</h2>
    <p>
      Não vendemos dados pessoais. Compartilhamos dados apenas com provedores de infraestrutura essenciais à operação
      (por exemplo, serviços de banco de dados e hospedagem) e quando exigido por lei. Esses provedores tratam os dados
      conforme nossas instruções e com medidas de segurança adequadas.
    </p>

    <h2>5. Armazenamento e segurança</h2>
    <p>
      Os dados são armazenados em ambiente seguro, com controle de acesso e isolamento por usuário. Tokens de acesso de
      integrações são armazenados de forma criptografada. Adotamos medidas técnicas e organizacionais para proteger os
      dados contra acesso não autorizado, perda ou alteração.
    </p>

    <h2 id="exclusao">6. Exclusão de dados</h2>
    <p>
      Para solicitar a exclusão dos seus dados, incluindo os dados obtidos via integração com o Facebook, envie um e-mail
      para <a href={`mailto:${CONTACT}`}>{CONTACT}</a> com o assunto <strong>"Exclusão de dados"</strong>, informando o
      e-mail cadastrado. Processaremos a solicitação em até 30 dias. Você também pode desconectar a integração com o
      Facebook a qualquer momento em <strong>Configurações → Integração Facebook → Desconectar</strong>, o que interrompe
      o acesso e remove as credenciais armazenadas.
    </p>

    <h2 id="grupos-whatsapp">7. Grupos de WhatsApp (plano Max)</h2>
      <p>
        Quem usa o módulo de campanhas em grupos conecta o próprio número de
        WhatsApp ao MarketDash. Sobre esse uso:
      </p>
      <ul>
        <li>
          <strong>Do seu número</strong>, guardamos o estado da conexão, o
          número em si e a lista dos grupos de que você participa (nome, foto,
          quantidade de participantes e se você é administrador).
        </li>
        <li>
          <strong>Por padrão, não lemos nem armazenamos o conteúdo das
          mensagens</strong> dos seus grupos: a conexão é configurada para
          receber apenas eventos de estado e de entrada/saída de participantes.
          A única exceção é o monitoramento, descrito abaixo — e ele só existe
          enquanto você o mantiver ligado.
        </li>
        <li>
          <strong>Monitoramento de grupo (opcional, desligado por padrão).</strong>{" "}
          Ao ligar um monitoramento, a conexão daquele número passa a receber
          mensagens para que você possa replicar ofertas com o seu link. O
          WhatsApp entrega esse evento <strong>por número, não por grupo</strong>:
          enquanto o monitoramento estiver ligado, as mensagens das suas
          conversas trafegam até o nosso servidor, que <strong>descarta na hora
          tudo que não é do grupo monitorado</strong> — conversas privadas e
          outros grupos são ignorados antes de qualquer gravação. Nesse caso:
          <ul>
            <li>
              guardamos <strong>o texto</strong> das mensagens do grupo
              monitorado que passam no seu filtro (por padrão, apenas as que
              contêm um link) e descartamos as demais sem gravá-las. Como o
              texto é escrito por outras pessoas, ele pode conter dados que elas
              próprias divulgaram — use filtros por palavra-chave para restringir
              a captura ao que interessa;
            </li>
            <li>
              <strong>não guardamos quem escreveu</strong> — nenhum número, nome
              ou identificador do autor da mensagem;
            </li>
            <li>
              as mensagens capturadas são <strong>apagadas automaticamente após
              30 dias</strong> — a finalidade (replicar uma oferta) é passageira,
              e guardar além disso não serviria a nada. O que você escolheu
              <em>enviar</em> continua no seu histórico de envios, como qualquer
              outra mensagem sua;
            </li>
            <li>
              ao desligar ou excluir o monitoramento, a conexão volta a não
              receber mensagens daquele grupo, e excluir o monitoramento apaga
              as capturas dele.
            </li>
          </ul>
          Se o grupo for de terceiros, você é responsável por observar as regras
          do grupo e os direitos de quem escreve nele.
        </li>
        <li>
          <strong>De quem entra ou sai dos seus grupos</strong>, registramos
          somente a data, o grupo, a origem (link ou entrada espontânea) e um{" "}
          <em>código irreversível</em> derivado do número da pessoa. Esse
          código serve apenas para saber quantas pessoas permaneceram no grupo
          — o número de telefone de terceiros não é armazenado.
        </li>
        <li>
          <strong>O envio é feito pelo seu número</strong>, por sua conta e
          risco: o WhatsApp pode restringir números com uso considerado
          abusivo. O MarketDash aplica limites e intervalos para reduzir esse
          risco, mas não pode eliminá-lo.
        </li>
        <li>
          Ao remover um número no painel, encerramos a sessão e apagamos as
          credenciais de conexão. Os registros agregados de desempenho
          (cliques, entradas, comissão por grupo) permanecem, por serem dados
          da sua operação.
        </li>
      </ul>

      <h2>8. Seus direitos (LGPD)</h2>
    <p>
      Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade e exclusão dos seus
      dados, bem como revogar consentimentos, entrando em contato pelo e-mail abaixo.
    </p>

    <h2>9. Contato</h2>
    <p>
      Dúvidas sobre esta política ou sobre seus dados? Fale com o encarregado de dados pelo e-mail{" "}
      <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
    </p>
  </LegalLayout>
);

export default PrivacyPolicy;

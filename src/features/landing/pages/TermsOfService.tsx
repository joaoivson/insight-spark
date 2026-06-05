import LegalLayout from "./LegalLayout";

const CONTACT = "relacionamento@marketdash.com.br";

const TermsOfService = () => (
  <LegalLayout title="Termos de Uso" updatedAt="junho de 2026">
    <p>
      Estes Termos de Uso regem o acesso e a utilização da plataforma <strong>MarketDash</strong>, operada pela{" "}
      <strong>ORQUESTRA IA - TRANSFORMANDO SOLUÇÕES LTDA</strong> (CNPJ 66.641.347/0001-21). Ao criar uma conta ou
      utilizar o serviço, você concorda com estes termos.
    </p>

    <h2>1. Descrição do serviço</h2>
    <p>
      O MarketDash é uma plataforma de analytics para marketing digital e afiliados, que consolida dados de vendas,
      comissões e anúncios para gerar dashboards e relatórios de desempenho, podendo, mediante autorização do usuário,
      integrar-se a plataformas como Shopee e Meta (Facebook).
    </p>

    <h2>2. Conta e responsabilidades</h2>
    <ul>
      <li>Você é responsável por manter a confidencialidade das suas credenciais e por todas as atividades na sua conta.</li>
      <li>Você declara ter autorização para conectar as contas e dados que integrar à plataforma.</li>
      <li>É vedado usar o serviço para fins ilícitos ou que violem termos de terceiros (incluindo os da Meta e da Shopee).</li>
    </ul>

    <h2>3. Integrações de terceiros</h2>
    <p>
      Ao conectar serviços de terceiros (como o Facebook), você autoriza o MarketDash a acessar os dados necessários ao
      funcionamento das funcionalidades contratadas, conforme nossa{" "}
      <a href="/privacy">Política de Privacidade</a>. Ações como pausar/ativar campanhas e alterar orçamento são
      executadas por sua iniciativa e sob sua responsabilidade.
    </p>

    <h2>4. Planos e pagamento</h2>
    <p>
      O acesso a determinadas funcionalidades pode depender de assinatura ativa. Condições, valores e formas de pagamento
      são apresentados no momento da contratação.
    </p>

    <h2>5. Limitação de responsabilidade</h2>
    <p>
      O serviço é fornecido "no estado em que se encontra". O MarketDash não se responsabiliza por decisões tomadas com
      base nos relatórios, nem por indisponibilidades ou alterações de APIs de terceiros. Não garantimos resultados
      específicos de campanhas.
    </p>

    <h2>6. Alterações</h2>
    <p>
      Podemos atualizar estes Termos periodicamente. Mudanças relevantes serão comunicadas pelos canais da plataforma. O
      uso continuado após as alterações implica concordância.
    </p>

    <h2>7. Contato</h2>
    <p>
      Dúvidas sobre estes Termos? Fale conosco pelo e-mail <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
    </p>
  </LegalLayout>
);

export default TermsOfService;

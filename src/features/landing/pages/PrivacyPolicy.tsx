import LegalLayout from "./LegalLayout";

const CONTACT = "relacionamento@marketdash.com.br";

const PrivacyPolicy = () => (
  <LegalLayout title="Política de Privacidade" updatedAt="junho de 2026">
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

    <h2>7. Seus direitos (LGPD)</h2>
    <p>
      Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade e exclusão dos seus
      dados, bem como revogar consentimentos, entrando em contato pelo e-mail abaixo.
    </p>

    <h2>8. Contato</h2>
    <p>
      Dúvidas sobre esta política ou sobre seus dados? Fale com o encarregado de dados pelo e-mail{" "}
      <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
    </p>
  </LegalLayout>
);

export default PrivacyPolicy;

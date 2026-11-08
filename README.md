# SurvivalManager — Gestão de Estoque para Sobrevivência

O **SurvivalManager** é uma aplicação web voltada ao gerenciamento de suprimentos e insumos essenciais em situações de emergência e preparação sobrevivencialista.

Projetada com arquitetura **100% Offline-First**, a aplicação não possui qualquer dependência de conexão com a internet ou serviços em nuvem: todos os recursos de interface, relatórios, gráficos e ícones estão empacotados localmente no repositório.

---

## 🚀 Principais Funcionalidades

### 1. Gestão de Validade com Prioridade FIFO (First In, First Out)
- **Ordenação Inteligente:** Os suprimentos com data de validade mais próxima são apresentados automaticamente no topo da lista, assegurando o consumo prioritário do que vence antes.
- **Categorização Visual por Níveis de Urgência:**
  - 🔴 **VENCIDO** (`Data < hoje`): Destaque imediato para descarte ou avaliação de segurança.
  - 🟠 **CRÍTICO** (`≤ 7 dias`): Alerta para consumo emergencial.
  - 🟡 **ATENÇÃO** (`8 a 30 dias`): Insumos prioritários para rotação do estoque.
  - 🟢 **OK** (`> 30 dias`): Estoque dentro do prazo de segurança.
  - ⚪ **Sem Validade**: Para ferramentas, equipamentos e utensílios duráveis.
- **Alerta ao Iniciar:** Janela de notificação na abertura com listagem separada por nível de criticidade.

### 2. Calculadora de Consumo Per Capita (Kit de Emergência)
- Ferramenta de estimativa integrada que calcula o consumo necessário a partir de três parâmetros:
  - **Número de pessoas** (adultos);
  - **Duração do período** (em dias);
  - **Número de refeições diárias**.
- Baseada em parâmetros nutricionais e práticos de campo para 15 itens essenciais (arroz, massas, aveia, leite em pó, biscoitos, proteínas em lata, mel, água potável, água sanitária/higiene e iluminação por velas).
- Apresenta o total bruto, a margem de segurança recomendada e a **quantidade exata de embalagens comerciais a comprar**.
- Exportação da lista de compras em formato **PDF**.

### 3. Guia de Sobrevivência Embutido (Manual Militar)
- Mentor teórico e operacional completo, extraído e adaptado de manuais das Forças Armadas, organizado em abas:
  - 🧠 **Psicologia:** Vontade de sobreviver, controle do pânico e dinâmica de grupo.
  - 🧭 **Orientação:** Método da vareta/sombra, navegação astronômica e uso da bússola.
  - 🏕 **Abrigo & Fogo:** Isolamento térmico do solo, estruturas de proteção e ignição sem isqueiro.
  - 💧 **Água & Alimentos:** Fervura, cloração de emergência (dosagem por litro) e filtragem por decantação.
  - 🩺 **Primeiros Socorros:** Contenção de hemorragias, torniquetes, imobilizações e prevenção de choque.
  - 📦 **Gestão FIFO:** Rotina de auditoria, rotação ativa e inspeção de latas.
  - ⚠️ **Emergências:** Sinais internacionais de resgate (SOS), marcações terrestres para aeronaves e protocolos em caso de apagão.

### 4. Persistência de Dados & Backup Automático
- Os dados são gravados localmente no navegador utilizando **IndexedDB** (não necessita de banco MySQL ou servidores externos ativos).
- **Backup JSON Automático:** Disparado ao cadastrar, editar ou excluir insumos, bem como ao fechar a aplicação (`survival-backup-AAAA-MM-DD.json`).
- Opção de **Backup Manual** e **Restauração via JSON** a qualquer momento.

### 5. Relatórios e Dashboard Estatístico
- **Relatório PDF em Ordem FIFO:** Documento para impressão com contadores no cabeçalho e marcação colorida por status de validade.
- **Dashboard de Gráficos:** Distribuição do estoque por categoria, status de validade, contagem de itens idênticos e massa/volume total.

### 6. Suporte Multilíngue
- Suporte a 4 idiomas: Português (pt-BR), Inglês (en), Espanhol (es) e Mandarim (zh).

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Semântico**
- **CSS3 Nativo** (tema escuro de alto contraste tático)
- **JavaScript Puro** (Vanilla ES6+)
- **IndexedDB** (Persistência no navegador)
- **Bootstrap 5.3.3** (empacotado localmente em `vendor/bootstrap/`)
- **Font Awesome 6.5.2** (empacotado localmente em `vendor/fontawesome/`)
- **Chart.js 4.4.3** (empacotado localmente em `vendor/chartjs/`)
- **jsPDF 2.5.1** (empacotado localmente em `vendor/jspdf/`)

---

## 📖 Como Executar

Por ser uma aplicação pura do lado cliente (client-side), não é necessária a instalação de Node.js, PHP, servidores web ou bancos de dados adicionais.

1. Clone o repositório ou faça o download dos arquivos:
   ```bash
   git clone https://github.com/debem1972/projetoSobrevivencia.git
   ```
2. Abra o arquivo `index.html` diretamente em qualquer navegador moderno (Chrome, Firefox, Edge, etc.):
   - Basta dar um duplo clique no arquivo `index.html` ou abri-lo via `file:///`.
3. Para acesso em rede local (sem internet), pode-se subir um servidor estático simples:
   ```bash
   python3 -m http.server 8080
   ```

---

## 🔒 Privacidade e Segurança

- Nenhum dado pessoal ou do estoque sai do seu computador.
- Não há chamadas a APIs externas, rastreadores ou CDNs de terceiros.
- Todos os arquivos operam normalmente mesmo com o dispositivo em Modo Avião ou sem rede.

---

## ✍️ Autoria

- **Desenvolvedor:** Daniel Lopes Bemfica
- **Licença:** MIT

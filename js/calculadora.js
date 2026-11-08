// ============================================================
// Calculadora de Estoque de Sobrevivência
// Dados extraídos da planilha kit_emergencia_6pessoas_7dias.xlsx
// Stack: JS puro, sem dependências externas
// ============================================================

const SURVIVAL_ITEMS_DATA = [
    {
        name: 'Arroz',
        unit: 'g',
        portionPerPersonPerMeal: 60,
        mealFraction: 2 / 3,          // almoço + jantar
        packageSize: 1000,
        packageLabel: 'Pacote 1 kg',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: 'Almoço e jantar (60 g crus/pessoa ≈ 150 g cozidos). Exige fogareiro ou fogão a gás.'
    },
    {
        name: 'Miojo',
        unit: 'g',
        portionPerPersonPerMeal: 85,
        mealFraction: 1 / 3,          // jantar
        packageSize: 85,
        packageLabel: 'Pacote 85 g',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: '1 pacote por pessoa, 1 refeição/dia (jantar). Exige fogão.'
    },
    {
        name: 'Aveia',
        unit: 'g',
        portionPerPersonPerMeal: 40,
        mealFraction: 1 / 3,          // café da manhã
        packageSize: 170,
        packageLabel: 'Pacote 170 g',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: 'Café da manhã, com leite em pó e mel.'
    },
    {
        name: 'Leite em pó',
        unit: 'g',
        portionPerPersonPerMeal: 50,
        mealFraction: 1 / 3,          // café da manhã
        packageSize: 400,
        packageLabel: 'Lata/pacote 400 g',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: 'Café da manhã; ~2 copos prontos/pessoa. Use pacotes bem fechados.'
    },
    {
        name: 'Biscoito água e sal',
        unit: 'g',
        portionPerPersonPerMeal: 25,
        mealFraction: 1,              // todas as refeições
        packageSize: 350,
        packageLabel: 'Pacote 350 g',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: '~5 biscoitos/pessoa em todas as refeições. Longa validade.'
    },
    {
        name: 'Mel',
        unit: 'g',
        portionPerPersonPerMeal: 40,
        mealFraction: 1 / 3,          // café da manhã
        packageSize: 500,
        packageLabel: 'Pote 500 g',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: '~2 colheres de sopa no café da manhã. Fonte de energia de longa validade.'
    },
    {
        name: 'Sardinha em lata',
        unit: 'g',
        portionPerPersonPerMeal: 62.5,
        mealFraction: 1,              // pior caso: todas as refeições
        packageSize: 125,
        packageLabel: 'Lata 125 g',
        safetyMargin: 0.10,
        isWater: false,
        isCandle: false,
        obs: '½ lata/pessoa por refeição. PIOR CASO: todas as refeições. Se alternar com salsicha, reduza a frequência.'
    },
    {
        name: 'Salsicha em lata',
        unit: 'un',
        portionPerPersonPerMeal: 2,
        mealFraction: 1,              // pior caso: todas as refeições
        packageSize: 6,
        packageLabel: 'Lata (~6 salsichas)',
        safetyMargin: 0.10,
        isWater: false,
        isCandle: false,
        obs: '2 salsichas/pessoa. PIOR CASO: todas as refeições. Confira o n° de salsichas por lata no rótulo.'
    },
    {
        name: 'Sal',
        unit: 'g',
        portionPerPersonPerMeal: 1,
        mealFraction: 1,              // todas as refeições
        packageSize: 1000,
        packageLabel: 'Pacote 1 kg',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: '1 g/pessoa/refeição. As enlatadas já são salgadas — use com moderação.'
    },
    {
        name: 'Leite condensado',
        unit: 'g',
        portionPerPersonPerMeal: 30,
        mealFraction: 2 / 3,          // café da manhã + jantar
        packageSize: 395,
        packageLabel: 'Lata/caixa 395 g',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: '~1 lata/dia no café e jantar. Abra e consuma no mesmo dia.'
    },
    {
        name: 'Gelatina',
        unit: 'porção (~125 mL)',
        portionPerPersonPerMeal: 1,
        mealFraction: 1 / 3,          // 1× por dia
        packageSize: 4,
        packageLabel: 'Sachê (4 porções)',
        safetyMargin: 0.20,
        isWater: false,
        isCandle: false,
        obs: '1/pessoa/dia. Sem geladeira não firma; consumir como bebida/sobremesa líquida. Usa ~5 L de água no total.'
    },
    // ---- ÁGUA (cálculo diário, não por refeição) ----
    {
        name: 'Água potável',
        unit: 'L',
        literPerPersonPerDay: 4,      // beber + cozinhar + higiene bucal
        packageSize: 20,
        packageLabel: 'Galão 20 L',
        safetyMargin: 0.10,
        isWater: true,
        isCandle: false,
        obs: 'Beber 2 L + cozinhar 1,2 L + higiene bucal 0,3 L + margem 0,5 L por pessoa/dia.'
    },
    {
        name: 'Água não potável (higiene)',
        unit: 'L',
        literPerPersonPerDay: 10,     // mãos + utensílios + banho de caneca
        packageSize: 50,
        packageLabel: 'Bombona 50 L',
        safetyMargin: 0.10,
        isWater: true,
        isCandle: false,
        obs: "Mãos 3 L + utensílios 2 L + banho de caneca 5 L. Identifique claramente 'NÃO POTÁVEL'."
    },
    {
        name: 'Água não potável (descarga)',
        unit: 'L',
        literPerPersonPerDay: 8,      // ~2 descargas/dia
        packageSize: 50,
        packageLabel: 'Bombona 50 L',
        safetyMargin: 0.10,
        isWater: true,
        isCandle: false,
        obs: 'Balde, ~2 descargas/pessoa/dia. Pode reaproveitar água do banho de caneca.'
    },
    // ---- VELAS (cálculo por noite) ----
    {
        name: 'Velas',
        unit: 'vela',
        isCandle: true,
        isWater: false,
        lightPoints: 3,               // pontos de luz simultâneos
        hoursPerNight: 4,             // 19h–23h
        candleHours: 6,               // duração de 1 vela ~17 cm
        packageSize: 1,
        packageLabel: 'Vela branca ~17 cm',
        safetyMargin: 0.20,
        obs: '3 pontos de luz × 4 h/noite ÷ 6 h/vela = 2 velas/noite. Columa E = noites.'
    }
];

// ============================================================
// FUNÇÕES DE CÁLCULO
// ============================================================

function calcularItem(item, pessoas, dias, refeicoesPerDay) {
    const totalRefeicoes = dias * refeicoesPerDay;

    if (item.isCandle) {
        // Velas: por noite
        const velasPorNoite = Math.ceil((item.lightPoints * item.hoursPerNight) / item.candleHours);
        const totalVelas = velasPorNoite * dias;
        const totalComMargem = Math.ceil(totalVelas * (1 + item.safetyMargin));
        return {
            name: item.name,
            unit: item.unit,
            porcaoLabel: `${velasPorNoite} vela(s)/noite`,
            consumoGrupoRefeicao: `${velasPorNoite}/noite`,
            refeicoesAplicaveis: `${dias} noite(s)`,
            totalBruto: totalVelas,
            totalBrutoLabel: `${totalVelas} velas`,
            margem: `+${Math.round(item.safetyMargin * 100)}%`,
            packageLabel: item.packageLabel,
            embalagensComprar: totalComMargem,
            embalagensLabel: `${totalComMargem} velas`,
            obs: item.obs
        };
    }

    if (item.isWater) {
        // Água: por dia
        const totalLitros = item.literPerPersonPerDay * pessoas * dias;
        const totalComMargem = totalLitros * (1 + item.safetyMargin);
        const embalagens = Math.ceil(totalComMargem / item.packageSize);
        return {
            name: item.name,
            unit: item.unit,
            porcaoLabel: `${item.literPerPersonPerDay} L/pessoa/dia`,
            consumoGrupoRefeicao: `${(item.literPerPersonPerDay * pessoas).toFixed(1)} L/dia`,
            refeicoesAplicaveis: `${dias} dia(s)`,
            totalBruto: totalLitros,
            totalBrutoLabel: `${totalLitros.toFixed(1)} L`,
            margem: `+${Math.round(item.safetyMargin * 100)}%`,
            packageLabel: item.packageLabel,
            embalagensComprar: embalagens,
            embalagensLabel: `${embalagens} × ${item.packageLabel}`,
            obs: item.obs
        };
    }

    // Itens alimentares: por refeição
    const refeicoesAplicaveis = Math.round(totalRefeicoes * item.mealFraction);
    const consumoGrupoRefeicao = item.portionPerPersonPerMeal * pessoas;
    const totalBruto = consumoGrupoRefeicao * refeicoesAplicaveis;
    const embalagensBasico = Math.ceil(totalBruto / item.packageSize);
    const embalagensComMargem = Math.ceil(embalagensBasico * (1 + item.safetyMargin));

    return {
        name: item.name,
        unit: item.unit,
        porcaoLabel: `${item.portionPerPersonPerMeal} ${item.unit}/pessoa`,
        consumoGrupoRefeicao: `${consumoGrupoRefeicao} ${item.unit}`,
        refeicoesAplicaveis: `${refeicoesAplicaveis} de ${totalRefeicoes}`,
        totalBruto: totalBruto,
        totalBrutoLabel: `${totalBruto} ${item.unit}`,
        margem: `+${Math.round(item.safetyMargin * 100)}%`,
        packageLabel: item.packageLabel,
        embalagensComprar: embalagensComMargem,
        embalagensLabel: `${embalagensComMargem} × ${item.packageLabel}`,
        obs: item.obs
    };
}

function calcularEstoque(pessoas, dias, refeicoesPerDay) {
    return SURVIVAL_ITEMS_DATA.map(item => calcularItem(item, pessoas, dias, refeicoesPerDay));
}

// ============================================================
// RENDERIZAÇÃO DO MODAL
// ============================================================

window.abrirCalculadora = function () {
    playClickSound();
    const modal = new bootstrap.Modal(document.getElementById('calculadoraModal'));
    modal.show();
    calcularEExibir();
};

function calcularEExibir() {
    const pessoas = parseInt(document.getElementById('calcPessoas').value) || 6;
    const dias = parseInt(document.getElementById('calcDias').value) || 7;
    const refeicoes = parseInt(document.getElementById('calcRefeicoes').value) || 3;

    // Validação
    if (pessoas < 1 || dias < 1 || refeicoes < 1 || refeicoes > 6) {
        document.getElementById('calcResultados').innerHTML =
            '<tr><td colspan="7" class="text-center text-warning">Preencha valores válidos (pessoas ≥ 1, dias ≥ 1, refeições de 1–6).</td></tr>';
        return;
    }

    const resultados = calcularEstoque(pessoas, dias, refeicoes);
    renderizarResultados(resultados, pessoas, dias, refeicoes);
}

function renderizarResultados(resultados, pessoas, dias, refeicoes) {
    const tbody = document.getElementById('calcResultados');
    const totalRefeicoes = dias * refeicoes;

    // Atualizar resumo
    document.getElementById('calcResumo').innerHTML =
        `<strong>${pessoas}</strong> pessoa(s) × <strong>${dias}</strong> dia(s) × ` +
        `<strong>${refeicoes}</strong> refeição(ões)/dia = <strong>${totalRefeicoes}</strong> refeições totais`;

    tbody.innerHTML = '';

    // Separar por categoria para o PDF
    window.calcResultadosData = { resultados, pessoas, dias, refeicoes };

    resultados.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            `<td><strong>${r.name}</strong></td>` +
            `<td>${r.porcaoLabel}</td>` +
            `<td>${r.consumoGrupoRefeicao}</td>` +
            `<td>${r.refeicoesAplicaveis}</td>` +
            `<td>${r.totalBrutoLabel}</td>` +
            `<td>${r.margem}</td>` +
            `<td class="fw-bold text-warning">${r.embalagensLabel}</td>`;
        tbody.appendChild(tr);

        // Linha de observação
        if (r.obs) {
            const trObs = document.createElement('tr');
            trObs.classList.add('calc-obs-row');
            trObs.innerHTML = `<td colspan="7" class="calc-obs">${r.obs}</td>`;
            tbody.appendChild(trObs);
        }
    });
}

// ============================================================
// PDF DA LISTA DE COMPRAS
// ============================================================

window.gerarPdfCalculadora = function () {
    if (!window.calcResultadosData) return;
    playClickSound();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { resultados, pessoas, dias, refeicoes } = window.calcResultadosData;

    const corTitulo = [212, 160, 23];
    const corEscuro = [42, 52, 42];

    // Cabeçalho
    doc.setFontSize(16);
    doc.setTextColor(...corTitulo);
    doc.text('Lista de Compras — Estoque de Sobrevivência', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const totalRef = dias * refeicoes;
    doc.text(`${pessoas} pessoa(s) · ${dias} dia(s) · ${refeicoes} refeição(ões)/dia · ${totalRef} refeições totais`, 105, 23, { align: 'center' });
    doc.text(new Date().toLocaleDateString('pt-BR'), 105, 29, { align: 'center' });

    // Tabela
    let y = 38;
    const headers = ['Item', 'Porção/pessoa', 'Grupo/refeição', 'Refeições', 'Total', 'A COMPRAR'];
    const colWidths = [38, 30, 32, 24, 24, 42];
    const colX = [10];
    colWidths.forEach((w, i) => { if (i > 0) colX.push(colX[i - 1] + colWidths[i - 1]); });

    // Header da tabela
    doc.setFillColor(...corEscuro);
    doc.rect(10, y, 190, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 5.5));

    y += 8;
    doc.setTextColor(0, 0, 0);

    resultados.forEach((r, idx) => {
        if (y > 265) { doc.addPage(); y = 15; }
        doc.setFillColor(idx % 2 === 0 ? 245 : 255);
        doc.rect(10, y, 190, 7, 'F');
        doc.setFontSize(7.5);
        doc.text(r.name, colX[0] + 1, y + 5);
        doc.text(r.porcaoLabel, colX[1] + 1, y + 5);
        doc.text(r.consumoGrupoRefeicao, colX[2] + 1, y + 5);
        doc.text(String(r.refeicoesAplicaveis), colX[3] + 1, y + 5);
        doc.text(r.totalBrutoLabel, colX[4] + 1, y + 5);
        doc.setTextColor(...corTitulo);
        doc.setFontSize(7);
        doc.text(r.embalagensLabel, colX[5] + 1, y + 5);
        doc.setTextColor(0, 0, 0);
        y += 7;
    });

    // Rodapé
    y += 6;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('⚠ Sardinha e salsicha estão no pior caso (todas as refeições). Se alternadas, reduza a frequência de cada uma.', 10, y);
    y += 5;
    doc.text('⚠ Cozinhar arroz, miojo e aveia exige fogareiro ou fogão a gás com combustível reserva — item CRÍTICO não listado aqui.', 10, y);

    doc.save(`lista-compras-sobrevivencia-${pessoas}pessoas-${dias}dias.pdf`);
};

// ============================================================
// EVENTOS DOS CONTROLES
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    ['calcPessoas', 'calcDias', 'calcRefeicoes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcularEExibir);
    });
});

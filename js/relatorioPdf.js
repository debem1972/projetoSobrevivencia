function generatePDFReport() {
    if (!window.allItems || window.allItems.length === 0) {
        alert('Nenhum item cadastrado no estoque para gerar relatório.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cores do tema
    const darkGreen = [42, 52, 42]; // #2a342a
    const terracotta = [212, 160, 23]; // #d4a017
    const redExpired = [220, 53, 69];
    const orangeCritical = [253, 126, 20];
    const yellowWarning = [180, 140, 0];
    const greenOk = [40, 167, 69];

    // Ordenar cópia dos itens por FIFO (validade ASC)
    const sortedItems = [...window.allItems].sort((a, b) => {
        const valA = a.expirationDate ? new Date(a.expirationDate) : new Date('9999-12-31');
        const valB = b.expirationDate ? new Date(b.expirationDate) : new Date('9999-12-31');
        return valA - valB;
    });

    // Calcular estatísticas
    let totalVencidos = 0;
    let totalCriticos = 0;
    let totalAtencao = 0;
    let totalOk = 0;

    sortedItems.forEach(item => {
        if (!item.expirationDate) return;
        const st = getExpirationStatus(item.expirationDate);
        if (st.daysLeft !== null) {
            if (st.daysLeft < 0) totalVencidos++;
            else if (st.daysLeft <= 7) totalCriticos++;
            else if (st.daysLeft <= 30) totalAtencao++;
            else totalOk++;
        }
    });

    // Título
    doc.setFontSize(16);
    doc.setTextColor(...terracotta);
    doc.text('Relatório de Estoque de Sobrevivência (FIFO)', 105, 18, { align: 'center' });

    // Subtítulo e data
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} | Total de registros: ${sortedItems.length}`, 105, 25, { align: 'center' });

    // Bloco de Resumo de Validades
    doc.setFontSize(9);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(10, 29, 190, 10, 2, 2, 'F');

    doc.setTextColor(...(totalVencidos > 0 ? redExpired : [100, 100, 100]));
    doc.text(`Vencidos: ${totalVencidos}`, 15, 35.5);

    doc.setTextColor(...(totalCriticos > 0 ? orangeCritical : [100, 100, 100]));
    doc.text(`Críticos (<= 7d): ${totalCriticos}`, 60, 35.5);

    doc.setTextColor(...(totalAtencao > 0 ? yellowWarning : [100, 100, 100]));
    doc.text(`Atenção (8-30d): ${totalAtencao}`, 115, 35.5);

    doc.setTextColor(...greenOk);
    doc.text(`OK (> 30d): ${totalOk}`, 165, 35.5);

    // Cabeçalho da tabela
    const headers = ['Nome', 'Tipo', 'Massa/Volume', 'Validade', 'Status (Prioridade FIFO)'];
    const colX = [12, 60, 100, 135, 160];
    let startY = 44;

    doc.setFontSize(9);
    doc.setFillColor(...darkGreen);
    doc.rect(10, startY, 190, 8, 'F');
    doc.setTextColor(255, 255, 255);
    headers.forEach((header, index) => {
        doc.text(header, colX[index], startY + 5.5);
    });

    startY += 8;

    sortedItems.forEach((item, rowIndex) => {
        if (startY > 275) {
            doc.addPage();
            startY = 20;

            // Repete cabeçalho na nova página
            doc.setFillColor(...darkGreen);
            doc.rect(10, startY, 190, 8, 'F');
            doc.setTextColor(255, 255, 255);
            headers.forEach((header, index) => {
                doc.text(header, colX[index], startY + 5.5);
            });
            startY += 8;
        }

        const st = getExpirationStatus(item.expirationDate);
        const tipoFormatado = (translations[currentLang] && translations[currentLang][item.type]) || item.type;
        const massaFormatada = item.mass ? `${item.mass} ${(translations[currentLang] && translations[currentLang][item.unit]) || item.unit}` : '-';
        const validadeFormatada = item.expirationDate ? formatDateWithoutTimezone(item.expirationDate) : '-';

        // Linha zebrada
        doc.setFillColor(rowIndex % 2 === 0 ? 248 : 255);
        doc.rect(10, startY, 190, 7.5, 'F');

        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        doc.text(item.name.substring(0, 24), colX[0], startY + 5);
        doc.text(tipoFormatado.substring(0, 18), colX[1], startY + 5);
        doc.text(massaFormatada.substring(0, 16), colX[2], startY + 5);
        doc.text(validadeFormatada, colX[3], startY + 5);

        // Cor do status
        if (st.daysLeft !== null) {
            if (st.daysLeft < 0) {
                doc.setTextColor(...redExpired);
            } else if (st.daysLeft <= 7) {
                doc.setTextColor(...orangeCritical);
            } else if (st.daysLeft <= 30) {
                doc.setTextColor(...yellowWarning);
            } else {
                doc.setTextColor(...greenOk);
            }
        } else {
            doc.setTextColor(120, 120, 120);
        }

        doc.setFont(undefined, 'bold');
        doc.text(st.label, colX[4], startY + 5);
        doc.setFont(undefined, 'normal');

        startY += 7.5;
    });

    // Rodapé de segurança
    if (startY > 270) {
        doc.addPage();
        startY = 20;
    }
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('* FIFO (First In, First Out): Itens com validade mais próxima devem ser consumidos primeiro.', 10, startY + 6);
    doc.text('** O sistema Survival Manager opera de forma 100% autônoma e offline.', 10, startY + 10);

    doc.save(`relatorio_estoque_${new Date().toISOString().slice(0, 10)}.pdf`);
}
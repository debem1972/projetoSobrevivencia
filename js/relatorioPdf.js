function generatePDFReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Definir cores do tema
    const darkGreen = [42, 52, 42]; // RGB para #2a342a
    const terracotta = [212, 160, 23]; // RGB para #d4a017

    // Título
    doc.setFontSize(18);
    doc.setTextColor(...terracotta);
    doc.text('Relatório de Estoque - Sobrevivencialismo', 105, 20, { align: 'center' });

    // Data
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(new Date().toLocaleDateString('pt-BR'), 105, 30, { align: 'center' });

    // Cabeçalho da tabela
    const headers = ['Nome', 'Tipo', 'Massa/Volume', 'Data de Validade'];
    const data = window.allItems.map(item => [
        item.name,
        item.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        item.mass ? `${item.mass} ${item.unit}` : '-',
        item.expirationDate ? new Date(item.expirationDate).toLocaleDateString('pt-BR') : '-'
    ]);

    // Gerar tabela com jsPDF
    let startY = 40;
    doc.setFontSize(10);
    doc.setFillColor(...darkGreen);
    doc.rect(10, startY, 190, 10, 'F');
    doc.setTextColor(255, 255, 255);
    headers.forEach((header, index) => {
        doc.text(header, 15 + index * 47.5, startY + 7);
    });

    // Linhas da tabela
    startY += 10;
    doc.setTextColor(0, 0, 0);
    data.forEach((row, rowIndex) => {
        doc.setFillColor(rowIndex % 2 === 0 ? 240 : 255);
        doc.rect(10, startY, 190, 10, 'F');
        row.forEach((cell, cellIndex) => {
            doc.text(cell, 15 + cellIndex * 47.5, startY + 7);
        });
        startY += 10;
        if (startY > 270) {
            doc.addPage();
            startY = 20;
        }
    });

    // Salvar PDF
    doc.save('relatorio_estoque.pdf');
}
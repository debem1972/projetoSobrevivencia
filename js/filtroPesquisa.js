// Configurando o input de filtro e busca
const inputBusca = document.querySelector('#dynamicFilter');
const tabelaHoras = document.querySelector('#itemTableBody');

inputBusca.addEventListener('keyup', function () {
    const expressoes = inputBusca.value.toLowerCase().split(' ').filter(expr => expr.length > 0); // Separa os termos de busca e remove termos vazios

    if (expressoes.length === 0) {
        applyFiltersAndSort();
        return;
    }

    const linhas = tabelaHoras.getElementsByTagName('tr');

    // Comece a partir da primeira linha (sem ignorar o cabeçalho, já que a lógica é dinâmica)
    for (let posicao = 0; posicao < linhas.length; posicao++) {
        const conteudoDaLinha = linhas[posicao].innerHTML.toLowerCase();
        const correspondencia = expressoes.every(expressao => conteudoDaLinha.includes(expressao)); // Verifica se todas as expressões estão na linha
        linhas[posicao].style.display = correspondencia ? '' : 'none';
    }

    // Manter a ordenação, se aplicável
    if (window.lastSortField && window.lastSortDirection) {
        applyFiltersAndSort();
    }
});

// Função para atualizar a exibição após filtragem (opcional, se precisar de totalização no futuro)
function atualizarTotal() {
    // Placeholder para futura funcionalidade de totalização, se desejar
}
// Função auxiliar para formatar data sem fuso horário
function formatDateWithoutTimezone(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
}

// Função para validar data
function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false; // Verifica se é uma data inválida
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliza para meia-noite
    return date >= today; // Impede datas no passado
}

// Função para atualizar sugestões de autocompletar
function updateItemNameSuggestions() {
    const datalist = document.getElementById('itemNameSuggestions');
    datalist.innerHTML = ''; // Limpa sugestões anteriores
    const uniqueNames = [...new Set(window.allItems.map(item => item.name))]; // Remove duplicatas
    uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

// Configuração do IndexedDB
let db;
window.allItems = [];
const dbRequest = indexedDB.open('SurvivalStockDB', 1);

dbRequest.onupgradeneeded = function (event) {
    db = event.target.result;
    const objectStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
    objectStore.createIndex('name', 'name', { unique: false });
    objectStore.createIndex('type', 'type', { unique: false });
    objectStore.createIndex('expirationDate', 'expirationDate', { unique: false });
};

dbRequest.onsuccess = function (event) {
    db = event.target.result;
    loadItems();
};

dbRequest.onerror = function (event) {
    console.error('Erro ao abrir o IndexedDB:', event.target.error);
};

// Função para carregar itens do IndexedDB
function loadItems() {
    const transaction = db.transaction(['items'], 'readonly');
    const objectStore = transaction.objectStore('items');
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        window.allItems = event.target.result;
        applyFiltersAndSort();
        updateItemNameSuggestions(); // Atualiza sugestões após carregar itens
        if (window.isDashboardOpen) {
            generateCharts(); // Atualiza gráficos se o dashboard estiver aberto
        }
    };

    request.onerror = function (event) {
        console.error('Erro ao carregar itens:', event.target.error);
    };
}

// Função para verificar datas de validade e exibir modal
function checkExpirationDates() {
    const today = new Date();
    const expiringItems = window.allItems.filter(item => {
        if (!item.expirationDate) return false;
        const expirationDate = new Date(item.expirationDate);
        const timeDiff = expirationDate - today;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        return daysDiff <= 30 && daysDiff >= 0;
    });

    if (expiringItems.length > 0) {
        const expiringItemsList = document.getElementById('expiringItemsList');
        expiringItemsList.innerHTML = '';
        expiringItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.name + " (" + (translations[currentLang][item.type] || item.type) + "): " + formatDateWithoutTimezone(item.expirationDate);
            expiringItemsList.appendChild(li);
        });

        const modal = new bootstrap.Modal(document.getElementById('expirationModal'));
        modal.show();
    }
}

// Função para adicionar ou atualizar item no IndexedDB
document.getElementById('itemForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const itemName = document.getElementById('itemName').value.trim();
    const itemType = document.getElementById('itemType').value;
    const mass = document.getElementById('mass').value || '';
    const unit = document.getElementById('unit').value || '';
    const expirationDate = document.getElementById('expirationDate').value || '';
    const editIndex = document.getElementById('editIndex').value;

    // Validação dos campos
    if (!itemName) {
        alert(translations[currentLang].nameRequiredAlert);
        document.getElementById('itemName').focus();
        return;
    }

    if (itemType !== 'ferramentas' && itemType !== 'equipamento' && itemType !== 'utensilio') {
        if (!mass || !unit || !expirationDate) {
            alert(translations[currentLang].requiredFieldsAlert);
            if (!mass) document.getElementById('mass').focus();
            else if (!unit) document.getElementById('unit').focus();
            else if (!expirationDate) document.getElementById('expirationDate').focus();
            return;
        }
        if (!isValidDate(expirationDate)) {
            alert(translations[currentLang].invalidExpirationDateAlert);
            document.getElementById('expirationDate').focus();
            return;
        }
    }

    const transaction = db.transaction(['items'], 'readwrite');
    const objectStore = transaction.objectStore('items');
    const item = {
        name: itemName,
        type: itemType,
        mass: mass,
        unit: unit,
        expirationDate: expirationDate
    };

    if (editIndex) {
        item.id = parseInt(editIndex);
        const request = objectStore.put(item);
        request.onsuccess = function () {
            loadItems();
            resetForm();
        };
    } else {
        const request = objectStore.add(item);
        request.onsuccess = function () {
            loadItems();
            resetForm();
        };
    }

    transaction.onerror = function (event) {
        console.error('Erro ao salvar item:', event.target.error);
    };
});

// Função para editar item
window.editItem = function (id) {
    playClickSound();
    const transaction = db.transaction(['items'], 'readonly');
    const objectStore = transaction.objectStore('items');
    const request = objectStore.get(id);

    request.onsuccess = function (event) {
        const item = event.target.result;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemType').value = item.type;
        document.getElementById('mass').value = item.mass || '';
        document.getElementById('unit').value = item.unit || '';
        document.getElementById('expirationDate').value = item.expirationDate || '';
        document.getElementById('editIndex').value = item.id;
        document.getElementById('submitButton').textContent = translations[currentLang].updateItem;
    };
};

// Função para excluir item
window.deleteItem = function (id) {
    playClickSound();
    if (confirm(translations[currentLang].confirmDelete)) {
        const transaction = db.transaction(['items'], 'readwrite');
        const objectStore = transaction.objectStore('items');
        const request = objectStore.delete(id);

        request.onsuccess = function () {
            loadItems();
        };

        request.onerror = function (event) {
            console.error('Erro ao excluir item:', event.target.error);
        };
    }
};

// Função para limpar o formulário
function resetForm() {
    document.getElementById('itemForm').reset();
    document.getElementById('editIndex').value = '';
    document.getElementById('submitButton').textContent = translations[currentLang].addItem;
    document.getElementById('itemName').focus(); // Definir foco no campo itemName
}

// Variáveis para rastrear a ordenação
let lastSortField = null;
let lastSortDirection = null;

// Função para ordenar itens
window.sortItems = function (field, direction) {
    playClickSound();
    lastSortField = field;
    lastSortDirection = direction;
    applyFiltersAndSort();
};

// Função para aplicar filtros e ordenação
window.applyFiltersAndSort = function () {
    const tableBody = document.getElementById('itemTableBody');
    const linhas = tableBody.getElementsByTagName('tr');

    for (let posicao = 0; posicao < linhas.length; posicao++) {
        linhas[posicao].style.display = '';
    }

    if (lastSortField && lastSortDirection) {
        window.allItems.sort((a, b) => {
            let valueA = a[lastSortField] || '';
            let valueB = b[lastSortField] || '';
            if (lastSortField === 'expirationDate') {
                valueA = valueA ? new Date(valueA) : new Date('9999-12-31');
                valueB = valueB ? new Date(valueB) : new Date('9999-12-31');
            }
            if (lastSortDirection === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
    }

    tableBody.innerHTML = '';
    window.allItems.forEach(item => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.id);
        row.innerHTML =
            "<td>" + item.name + "</td>" +
            "<td>" + (translations[currentLang][item.type] || item.type) + "</td>" +
            "<td>" + (item.mass ? item.mass + " " + (translations[currentLang][item.unit] || item.unit) : '-') + "</td>" +
            "<td>" + formatDateWithoutTimezone(item.expirationDate) + "</td>" +
            "<td>" +
            "<button class=\"btn btn-sm btn-warning me-1\" onclick=\"editItem(" + item.id + ")\">" + translations[currentLang].edit + "</button>" +
            "<button class=\"btn btn-sm btn-danger\" onclick=\"deleteItem(" + item.id + ")\">" + translations[currentLang].delete + "</button>" +
            "</td>";
        tableBody.appendChild(row);
    });
};

// Função para exportar dados para JSON
window.exportToJSON = function () {
    playClickSound();
    const transaction = db.transaction(['items'], 'readonly');
    const objectStore = transaction.objectStore('items');
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const data = event.target.result;
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'estoque_sobrevivencialismo.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    request.onerror = function (event) {
        console.error('Erro ao exportar para JSON:', event.target.error);
    };
};

// Função para importar dados de JSON
document.getElementById('importFile').addEventListener('change', function (e) {
    playClickSound();
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const importedData = JSON.parse(event.target.result);
                const transaction = db.transaction(['items'], 'readwrite');
                const objectStore = transaction.objectStore('items');

                const clearRequest = objectStore.clear();
                clearRequest.onsuccess = function () {
                    importedData.forEach(item => {
                        objectStore.add(item);
                    });
                    loadItems();
                    alert(translations[currentLang].importSuccess);
                };
                clearRequest.onerror = function (event) {
                    console.error('Erro ao limpar dados:', event.target.error);
                };
            } catch (error) {
                alert(translations[currentLang].importError + error.message);
            }
        };
        reader.readAsText(file);
    }
});

// Variáveis para rastrear gráficos e estado do dashboard
let typeChartInstance = null;
let expirationChartInstance = null;
let itemQuantityChartInstance = null;
let totalMassChartInstance = null;
window.isDashboardOpen = false;

// Função para exibir o dashboard
window.showDashboard = function () {
    playClickSound();
    const modal = new bootstrap.Modal(document.getElementById('dashboardModal'));
    modal.show();
};

// Configurar eventos do modal do dashboard
document.getElementById('dashboardModal').addEventListener('shown.bs.modal', function () {
    window.isDashboardOpen = true;
    generateCharts();
});

document.getElementById('dashboardModal').addEventListener('hidden.bs.modal', function () {
    window.isDashboardOpen = false;
});

// Função para gerar os gráficos
function generateCharts() {
    const today = new Date();
    const expiringItems = window.allItems.filter(item => {
        if (!item.expirationDate) return false;
        const expirationDate = new Date(item.expirationDate);
        const timeDiff = expirationDate - today;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        return daysDiff <= 30 && daysDiff >= 0;
    });

    // Destruir gráficos existentes
    if (typeChartInstance) typeChartInstance.destroy();
    if (expirationChartInstance) expirationChartInstance.destroy();
    if (itemQuantityChartInstance) itemQuantityChartInstance.destroy();
    if (totalMassChartInstance) totalMassChartInstance.destroy();

    // Gráfico de barras: Quantidade por tipo
    const typeCounts = {};
    window.allItems.forEach(item => {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });
    const typeLabels = Object.keys(typeCounts);
    const typeData = Object.values(typeCounts);

    typeChartInstance = new Chart(document.getElementById('typeChart'), {
        type: 'bar',
        data: {
            labels: typeLabels.map(type => translations[currentLang][type] || type),
            datasets: [{
                label: translations[currentLang].quantityByType,
                data: typeData,
                backgroundColor: '#d4a017',
                borderColor: '#b88c14',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: translations[currentLang].quantity }
                }
            },
            plugins: {
                legend: { labels: { color: '#f5f5f5' } }
            }
        }
    });

    // Gráfico de pizza: Itens próximos de vencer vs. válidos
    const validItems = window.allItems.length - expiringItems.length;
    expirationChartInstance = new Chart(document.getElementById('expirationChart'), {
        type: 'pie',
        data: {
            labels: [translations[currentLang].expiringSoon, translations[currentLang].valid],
            datasets: [{
                data: [expiringItems.length, validItems],
                backgroundColor: ['#d4a017', '#3a4a3a'],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: { labels: { color: '#f5f5f5' } }
            }
        }
    });

    // Gráfico de barras: Quantidade de itens iguais
    const itemCounts = {};
    window.allItems.forEach(item => {
        const key = item.name + " (" + (item.mass || '-') + " " + (translations[currentLang][item.unit] || item.unit || '-') + ")";
        itemCounts[key] = (itemCounts[key] || 0) + 1;
    });
    const itemLabels = Object.keys(itemCounts);
    const itemData = Object.values(itemCounts);

    itemQuantityChartInstance = new Chart(document.getElementById('itemQuantityChart'), {
        type: 'bar',
        data: {
            labels: itemLabels,
            datasets: [{
                label: translations[currentLang].quantityOfItems,
                data: itemData,
                backgroundColor: '#d4a017',
                borderColor: '#b88c14',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: translations[currentLang].quantity }
                }
            },
            plugins: {
                legend: { labels: { color: '#f5f5f5' } }
            }
        }
    });

    // Gráfico de barras: Massa/Volume total por produto
    const productTotals = {};
    window.allItems.forEach(item => {
        // Filtra apenas os tipos desejados
        if (['alimento', 'limpeza-higiene', 'agua'].includes(item.type) && item.mass && item.unit) {
            const key = `${item.name} (${item.unit})`;
            if (!productTotals[key]) {
                productTotals[key] = {
                    name: item.name,
                    count: 0,
                    totalMass: 0,
                    unit: item.unit,
                    type: item.type
                };
            }
            productTotals[key].count += 1;
            let mass = parseFloat(item.mass);
            // Converte para gramas ou mililitros
            if (item.unit === 'kilograma') {
                mass *= 1000; // kg -> g
                productTotals[key].unit = 'grama';
            } else if (item.unit === 'litro') {
                mass *= 1000; // L -> ml
                productTotals[key].unit = 'mililitro';
            }
            productTotals[key].totalMass += mass;
        }
    });

    const massLabels = Object.keys(productTotals);
    const massData = Object.values(productTotals).map(data => data.totalMass);
    const massUnits = Object.values(productTotals).map(data => translations[currentLang][data.unit] || data.unit);

    totalMassChartInstance = new Chart(document.getElementById('totalMassChart'), {
        type: 'bar',
        data: {
            labels: massLabels.map((key, index) => {
                const product = productTotals[key];
                return `${product.name} (${massUnits[index]})`;
            }),
            datasets: [{
                label: translations[currentLang].totalMassByProduct,
                data: massData,
                backgroundColor: '#d4a017',
                borderColor: '#b88c14',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: translations[currentLang].mass }
                },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: { labels: { color: '#f5f5f5' } }
            }
        }
    });
}

// Função para tocar som ao clicar
function playClickSound() {
    const clickSound = document.getElementById('clickSound');
    clickSound.currentTime = 0;
    clickSound.play().catch(error => {
        console.error('Erro ao tocar o som:', error);
    });
}
//------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    // Função para exibir a aplicação ao clicar na logo
    document.getElementById('appLogo').addEventListener('click', function () {
        //playClickSound();  //Ainda não implementado o som.

        // Desaparecer a logo suavemente
        const logoContainer = document.getElementById('logoContainer');
        logoContainer.style.opacity = '0';
        setTimeout(() => {
            logoContainer.style.display = 'none';
            // Exibir o welcomeScreen suavemente
            const welcomeScreen = document.getElementById('welcomeScreen');
            if (welcomeScreen) {
                welcomeScreen.classList.remove('d-none');
                setTimeout(() => {
                    welcomeScreen.classList.add('visible');
                }, 10); // Pequeno delay para garantir a transição de opacidade
            } else {
                console.error('Elemento #welcomeScreen não encontrado.');
            }
        }, 500); // Aguarda a transição de 0.5s

    });


    window.enterApp = function () {
        // playClickSound(); // Comentado, já que o som ainda não foi implementado

        // Desaparecer o welcomeScreen suavemente
        const welcomeScreen = document.getElementById('welcomeScreen');
        welcomeScreen.classList.remove('visible');
        welcomeScreen.style.opacity = '0';
        setTimeout(() => {
            welcomeScreen.classList.add('d-none');
        }, 1000); // Aguarda a transição de 1s

        // Exibir a aplicação principal suavemente
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.classList.remove('d-none');
            setTimeout(() => {
                mainApp.classList.add('visible');
                checkExpirationDates(); // Verifica itens próximos de vencer ao entrar
            }, 10); // Pequeno delay para garantir a transição de opacidade
            document.getElementById('languageSelector').classList.remove('d-none'); // Exibir seletor de idioma
        } else {
            console.error('Elemento #mainApp não encontrado.');
        }
    };
});
//------------------------------------------------------------------------



// Função para entrar na aplicação
/*window.enterApp = function () {
    playClickSound();
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    checkExpirationDates(); // Verifica itens próximos de vencer ao entrar
};*/
//Nova função para entrar na aplicação
/*window.enterApp = function () {
    playClickSound();
    document.getElementById('welcomeScreen').style.display = 'none';
    const mainApp = document.getElementById('mainApp');
    mainApp.style.display = 'block';
    setTimeout(() => {
        mainApp.classList.add('visible');
    }, 10); // Pequeno delay para garantir que a transição seja aplicada
    checkExpirationDates(); // Verifica itens próximos de vencer ao entrar
};*/

// Sistema de Tradução
const translations = {
    pt: {
        appTitle: "Gerenciamento de Estoque - Sobrevivencialismo",
        welcomeTitle: "Bem-vindo ao Gerenciamento de Estoque - Sobrevivencialismo",
        welcomeMessage: "Prepare-se para gerenciar seu estoque de forma eficiente e segura!",
        enterApp: "Entrar",
        mainTitle: "Gerenciamento de Estoque - Sobrevivencialismo",
        itemNameLabel: "Nome do Item",
        itemNamePlaceholder: "Ex: Arroz",
        itemTypeLabel: "Tipo do Item",
        selectTypePlaceholder: "Selecione o tipo",
        alimento: "Alimento",
        "limpeza-higiene": "Limpeza e Higiene",
        ferramentas: "Ferramentas",
        agua: "Água",
        equipamento: "Equipamento",
        utensilio: "Utensílio",
        massLabel: "Massa/Volume",
        massPlaceholder: "Ex: 1.5",
        unitLabel: "Unidade",
        selectUnitPlaceholder: "Selecione a unidade",
        grama: "Grama",
        kilograma: "Kilograma",
        litro: "Litro",
        mililitro: "Mililitro",
        expirationDateLabel: "Data de Validade",
        addItem: "Cadastrar Item",
        updateItem: "Atualizar Item",
        dynamicFilterLabel: "Pesquisa Dinâmica (ex: nome tipo data)",
        dynamicFilterPlaceholder: "Ex: Arroz alimento 2025-06-01",
        exportButton: "Exportar para JSON",
        importFileLabel: "Importar de JSON",
        pdfButton: "Gerar Relatório PDF",
        dashboardButton: "Abrir Dashboard",
        tableNameHeader: "Nome",
        tableTypeHeader: "Tipo",
        tableMassHeader: "Massa/Volume",
        tableExpirationHeader: "Data de Validade",
        tableActionsHeader: "Ações",
        edit: "Editar",
        delete: "Excluir",
        linksTitle: "Links Úteis para Sobrevivencialismo",
        windyLink: "Windy - Previsão do Clima",
        knotsLink: "Animated Knots - Aprenda a Fazer Nós",
        shelterLink: "Wilderness College - Construção de Abrigos",
        expirationModalLabel: "Aviso: Itens Próximos de Vencer",
        expirationMessage: "Os seguintes itens estão a 30 dias ou menos de vencer:",
        closeModalButton: "Fechar",
        dashboardModalLabel: "Dashboard de Estoque",
        closeDashboardButton: "Fechar",
        quantityByType: "Quantidade por Tipo",
        quantity: "Quantidade",
        expiringSoon: "Próximos de Vencer",
        valid: "Válidos",
        quantityOfItems: "Quantidade de Itens Iguais",
        totalMassByProduct: "Massa Total por Produto",
        mass: "Massa/Volume",
        requiredFieldsAlert: "Preencha todos os campos obrigatórios para itens que não sejam ferramenta, equipamento ou utensílio!",
        nameRequiredAlert: "O nome do item é obrigatório!",
        invalidExpirationDateAlert: "A data de validade é inválida ou está no passado!",
        confirmDelete: "Tem certeza que deseja excluir este item?",
        importSuccess: "Dados importados com sucesso!",
        importError: "Erro ao importar o arquivo JSON: "
    },
    en: {
        appTitle: "Stock Management - Survivalism",
        welcomeTitle: "Welcome to Stock Management - Survivalism",
        welcomeMessage: "Get ready to manage your stock efficiently and safely!",
        enterApp: "Enter",
        mainTitle: "Stock Management - Survivalism",
        itemNameLabel: "Item Name",
        itemNamePlaceholder: "Ex: Rice",
        itemTypeLabel: "Item Type",
        selectTypePlaceholder: "Select the type",
        alimento: "Food",
        "limpeza-higiene": "Cleaning and Hygiene",
        ferramentas: "Tools",
        agua: "Water",
        equipamento: "Equipment",
        utensilio: "Utensil",
        massLabel: "Mass/Volume",
        massPlaceholder: "Ex: 1.5",
        unitLabel: "Unit",
        selectUnitPlaceholder: "Select the unit",
        grama: "Gram",
        kilograma: "Kilogram",
        litro: "Liter",
        mililitro: "Milliliter",
        expirationDateLabel: "Expiration Date",
        addItem: "Add Item",
        updateItem: "Update Item",
        dynamicFilterLabel: "Dynamic Search (e.g., name type date)",
        dynamicFilterPlaceholder: "Ex: Rice food 2025-06-01",
        exportButton: "Export to JSON",
        importFileLabel: "Import from JSON",
        pdfButton: "Generate PDF Report",
        dashboardButton: "Open Dashboard",
        tableNameHeader: "Name",
        tableTypeHeader: "Type",
        tableMassHeader: "Mass/Volume",
        tableExpirationHeader: "Expiration Date",
        tableActionsHeader: "Actions",
        edit: "Edit",
        delete: "Delete",
        linksTitle: "Useful Links for Survivalism",
        windyLink: "Windy - Weather Forecast",
        knotsLink: "Animated Knots - Learn to Tie Knots",
        shelterLink: "Wilderness College - Building Shelters",
        expirationModalLabel: "Alert: Items Close to Expiring",
        expirationMessage: "The following items are 30 days or less from expiring:",
        closeModalButton: "Close",
        dashboardModalLabel: "Stock Dashboard",
        closeDashboardButton: "Close",
        quantityByType: "Quantity by Type",
        quantity: "Quantity",
        expiringSoon: "Expiring Soon",
        valid: "Valid",
        quantityOfItems: "Quantity of Identical Items",
        totalMassByProduct: "Total Mass by Product",
        mass: "Mass/Volume",
        requiredFieldsAlert: "Fill in all required fields for items that are not tools, equipment, or utensils!",
        nameRequiredAlert: "The item name is required!",
        invalidExpirationDateAlert: "The expiration date is invalid or in the past!",
        confirmDelete: "Are you sure you want to delete this item?",
        importSuccess: "Data imported successfully!",
        importError: "Error importing JSON file: "
    },
    es: {
        appTitle: "Gestión de Inventario - Supervivencia",
        welcomeTitle: "Bienvenido a la Gestión de Inventario - Supervivencia",
        welcomeMessage: "¡Prepárate para gestionar tu inventario de manera eficiente y segura!",
        enterApp: "Entrar",
        mainTitle: "Gestión de Inventario - Supervivencia",
        itemNameLabel: "Nombre del Ítem",
        itemNamePlaceholder: "Ej: Arroz",
        itemTypeLabel: "Tipo de Ítem",
        selectTypePlaceholder: "Selecciona el tipo",
        alimento: "Alimento",
        "limpeza-higiene": "Limpieza e Higiene",
        ferramentas: "Herramientas",
        agua: "Agua",
        equipamento: "Equipo",
        utensilio: "Utensilio",
        massLabel: "Masa/Volumen",
        massPlaceholder: "Ej: 1.5",
        unitLabel: "Unidad",
        selectUnitPlaceholder: "Selecciona la unidad",
        grama: "Gramo",
        kilograma: "Kilogramo",
        litro: "Litro",
        mililitro: "Mililitro",
        expirationDateLabel: "Fecha de Vencimiento",
        addItem: "Agregar Ítem",
        updateItem: "Actualizar Ítem",
        dynamicFilterLabel: "Búsqueda Dinámica (ej: nombre tipo fecha)",
        dynamicFilterPlaceholder: "Ej: Arroz alimento 2025-06-01",
        exportButton: "Exportar a JSON",
        importFileLabel: "Importar desde JSON",
        pdfButton: "Generar Informe PDF",
        dashboardButton: "Abrir Panel de Control",
        tableNameHeader: "Nombre",
        tableTypeHeader: "Tipo",
        tableMassHeader: "Masa/Volumen",
        tableExpirationHeader: "Fecha de Vencimiento",
        tableActionsHeader: "Acciones",
        edit: "Editar",
        delete: "Eliminar",
        linksTitle: "Enlaces Útiles para Supervivencia",
        windyLink: "Windy - Pronóstico del Clima",
        knotsLink: "Animated Knots - Aprende a Hacer Nudos",
        shelterLink: "Wilderness College - Construcción de Refugios",
        expirationModalLabel: "Alerta: Ítems Próximos a Vencer",
        expirationMessage: "Los siguientes ítems están a 30 días o menos de vencer:",
        closeModalButton: "Cerrar",
        dashboardModalLabel: "Panel de Inventario",
        closeDashboardButton: "Cerrar",
        quantityByType: "Cantidad por Tipo",
        quantity: "Cantidad",
        expiringSoon: "Próximos a Vencer",
        valid: "Válidos",
        quantityOfItems: "Cantidad de Ítems Idénticos",
        totalMassByProduct: "Masa Total por Producto",
        mass: "Masa/Volumen",
        requiredFieldsAlert: "¡Completa todos los campos obligatorios para ítems que no sean herramientas, equipos o utensilios!",
        nameRequiredAlert: "¡El nombre del ítem es obligatorio!",
        invalidExpirationDateAlert: "¡La fecha de vencimiento es inválida o está en el pasado!",
        confirmDelete: "¿Estás seguro de que deseas eliminar este ítem?",
        importSuccess: "¡Datos importados con éxito!",
        importError: "Error al importar el archivo JSON: "
    },
    zh: {
        appTitle: "库存管理 - 生存主义",
        welcomeTitle: "欢迎使用库存管理 - 生存主义",
        welcomeMessage: "准备好高效、安全地管理你的库存吧！",
        enterApp: "进入",
        mainTitle: "库存管理 - 生存主义",
        itemNameLabel: "物品名称",
        itemNamePlaceholder: "例：大米",
        itemTypeLabel: "物品类型",
        selectTypePlaceholder: "选择类型",
        alimento: "食品",
        "limpeza-higiene": "清洁与卫生",
        ferramentas: "工具",
        agua: "水",
        equipamento: "设备",
        utensilio: "器具",
        massLabel: "质量/体积",
        massPlaceholder: "例：1.5",
        unitLabel: "单位",
        selectUnitPlaceholder: "选择单位",
        grama: "克",
        kilograma: "千克",
        litro: "升",
        mililitro: "毫升",
        expirationDateLabel: "有效期",
        addItem: "添加物品",
        updateItem: "更新物品",
        dynamicFilterLabel: "动态搜索（例：名称 类型 日期）",
        dynamicFilterPlaceholder: "例：大米 食品 2025-06-01",
        exportButton: "导出为 JSON",
        importFileLabel: "从 JSON 导入",
        pdfButton: "生成 PDF 报告",
        dashboardButton: "打开仪表板",
        tableNameHeader: "名称",
        tableTypeHeader: "类型",
        tableMassHeader: "质量/体积",
        tableExpirationHeader: "有效期",
        tableActionsHeader: "操作",
        edit: "编辑",
        delete: "删除",
        linksTitle: "生存主义实用链接",
        windyLink: "Windy - 天气预报",
        knotsLink: "Animated Knots - 学习打结",
        shelterLink: "Wilderness College - 搭建庇护所",
        expirationModalLabel: "警告：即将过期的物品",
        expirationMessage: "以下物品将在 30 天或更短时间内过期：",
        closeModalButton: "关闭",
        dashboardModalLabel: "库存仪表板",
        closeDashboardButton: "关闭",
        quantityByType: "按类型统计数量",
        quantity: "数量",
        expiringSoon: "即将过期",
        valid: "有效",
        quantityOfItems: "相同物品数量",
        totalMassByProduct: "按产品统计总质量",
        mass: "质量/体积",
        requiredFieldsAlert: "请填写所有必填字段（对于非工具、设备或器具的物品）！",
        nameRequiredAlert: "物品名称为必填项！",
        invalidExpirationDateAlert: "有效期无效或已过期！",
        confirmDelete: "你确定要删除这个物品吗？",
        importSuccess: "数据导入成功！",
        importError: "导入 JSON 文件时出错："
    }
};

let currentLang = 'pt';

function changeLanguage(lang) {
    currentLang = lang;
    document.getElementById('appTitle').textContent = translations[lang].appTitle;
    document.getElementById('welcomeTitle').textContent = translations[lang].welcomeTitle;
    document.getElementById('welcomeMessage').textContent = translations[lang].welcomeMessage;
    document.getElementById('welcomeScreen').querySelector('button').textContent = translations[lang].enterApp;
    document.getElementById('mainTitle').textContent = translations[lang].mainTitle;
    document.getElementById('itemNameLabel').textContent = translations[lang].itemNameLabel;
    document.getElementById('itemName').placeholder = translations[lang].itemNamePlaceholder;
    document.getElementById('itemTypeLabel').textContent = translations[lang].itemTypeLabel;
    document.getElementById('selectTypePlaceholder').textContent = translations[lang].selectTypePlaceholder;
    document.querySelectorAll('#itemType option[data-lang-key]').forEach(option => {
        const key = option.getAttribute('data-lang-key');
        option.textContent = translations[lang][key];
    });
    document.getElementById('massLabel').textContent = translations[lang].massLabel;
    document.getElementById('mass').placeholder = translations[lang].massPlaceholder;
    document.getElementById('unitLabel').textContent = translations[lang].unitLabel;
    document.getElementById('selectUnitPlaceholder').textContent = translations[lang].selectUnitPlaceholder;
    document.querySelectorAll('#unit option[data-lang-key]').forEach(option => {
        const key = option.getAttribute('data-lang-key');
        option.textContent = translations[lang][key];
    });
    document.getElementById('expirationDateLabel').textContent = translations[lang].expirationDateLabel;
    document.getElementById('submitButton').textContent = translations[lang].addItem;
    document.getElementById('dynamicFilterLabel').textContent = translations[lang].dynamicFilterLabel;
    document.getElementById('dynamicFilter').placeholder = translations[lang].dynamicFilterPlaceholder;
    document.getElementById('exportButton').textContent = translations[lang].exportButton;
    document.getElementById('importFileLabel').textContent = translations[lang].importFileLabel;
    document.getElementById('pdfButton').textContent = translations[lang].pdfButton;
    document.getElementById('dashboardButton').textContent = translations[lang].dashboardButton;
    document.getElementById('tableNameHeader').childNodes[0].textContent = translations[lang].tableNameHeader;
    document.getElementById('tableTypeHeader').textContent = translations[lang].tableTypeHeader;
    document.getElementById('tableMassHeader').textContent = translations[lang].tableMassHeader;
    document.getElementById('tableExpirationHeader').childNodes[0].textContent = translations[lang].tableExpirationHeader;
    document.getElementById('tableActionsHeader').textContent = translations[lang].tableActionsHeader;
    document.getElementById('linksTitle').textContent = translations[lang].linksTitle;
    document.getElementById('windyLink').textContent = translations[lang].windyLink;
    document.getElementById('knotsLink').textContent = translations[lang].knotsLink;
    document.getElementById('shelterLink').textContent = translations[lang].shelterLink;
    document.getElementById('expirationModalLabel').textContent = translations[lang].expirationModalLabel;
    document.getElementById('expirationMessage').textContent = translations[lang].expirationMessage;
    document.getElementById('closeModalButton').textContent = translations[lang].closeModalButton;
    document.getElementById('dashboardModalLabel').textContent = translations[lang].dashboardModalLabel;
    document.getElementById('closeDashboardButton').textContent = translations[lang].closeDashboardButton;

    applyFiltersAndSort();
    if (window.isDashboardOpen) {
        generateCharts(); // Atualiza gráficos ao mudar idioma se dashboard estiver aberto
    }
}

// Adicionar evento de clique para todos os botões
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', playClickSound);
});


//Trata do botão de retorno ao tôpo
// Scroll to Top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
    const backToTop = document.querySelector('.back-to-top');
    if (window.scrollY > 300) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
});
//-----------------------------------------------------------------------

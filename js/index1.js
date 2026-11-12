// ============================================================
// Survival Manager — index1.js
// Versão 2.0 | Offline-First | FIFO | Backup Automático
// ============================================================

// ---- Utilitários de Data ----

function formatDateWithoutTimezone(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
}

function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

/**
 * Calcula o status de validade de um item.
 * @returns {{ label: string, cssClass: string, rowClass: string, daysLeft: number|null }}
 */
function getExpirationStatus(dateStr) {
    if (!dateStr) return { label: '—', cssClass: 'badge-no-date', rowClass: '', daysLeft: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = dateStr.split('-');
    const exp = new Date(year, month - 1, day);
    const diffMs = exp - today;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return { label: '🔴 VENCIDO', cssClass: 'badge-expired', rowClass: 'row-expired', daysLeft };
    } else if (daysLeft <= 7) {
        return { label: `🟠 CRÍTICO — ${daysLeft}d`, cssClass: 'badge-critical', rowClass: 'row-critical', daysLeft };
    } else if (daysLeft <= 30) {
        return { label: `🟡 ATENÇÃO — ${daysLeft}d`, cssClass: 'badge-warning', rowClass: 'row-warning', daysLeft };
    } else {
        return { label: `🟢 OK — ${daysLeft}d`, cssClass: 'badge-ok', rowClass: '', daysLeft };
    }
}

// ---- Autocompletar ----

function updateItemNameSuggestions() {
    const datalist = document.getElementById('itemNameSuggestions');
    datalist.innerHTML = '';
    const uniqueNames = [...new Set(window.allItems.map(item => item.name))];
    uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

// ---- IndexedDB (Schema v2) ----

let db;
window.allItems = [];
const dbRequest = indexedDB.open('SurvivalStockDB', 2);

dbRequest.onupgradeneeded = function (event) {
    db = event.target.result;
    const oldVersion = event.oldVersion;

    if (oldVersion < 1) {
        const objectStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('name', 'name', { unique: false });
        objectStore.createIndex('type', 'type', { unique: false });
        objectStore.createIndex('expirationDate', 'expirationDate', { unique: false });
    }
    // v2: campo createdAt (migração silenciosa — não destrói dados existentes)
    // O campo será adicionado a novos registros; existentes ficam sem ele (OK).
};

dbRequest.onsuccess = function (event) {
    db = event.target.result;
    loadItems();
};

dbRequest.onerror = function (event) {
    console.error('Erro ao abrir o IndexedDB:', event.target.error);
};

// ---- Carregar Itens ----

function loadItems() {
    const transaction = db.transaction(['items'], 'readonly');
    const objectStore = transaction.objectStore('items');
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        window.allItems = event.target.result;
        applyFiltersAndSort();
        updateItemNameSuggestions();
        updateExpirationAlertBadge();
        if (window.isDashboardOpen) {
            generateCharts();
        }
    };

    request.onerror = function (event) {
        console.error('Erro ao carregar itens:', event.target.error);
    };
}

// ---- Badge de Alerta no Header ----

function updateExpirationAlertBadge() {
    const badge = document.getElementById('expirationAlertBadge');
    if (!badge) return;
    const urgent = window.allItems.filter(item => {
        if (!item.expirationDate) return false;
        const st = getExpirationStatus(item.expirationDate);
        return st.daysLeft !== null && st.daysLeft <= 7;
    });
    if (urgent.length > 0) {
        badge.textContent = urgent.length;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
}

// ---- Verificar Validade ao Entrar ----

function checkExpirationDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const vencidos = [];
    const criticos = [];
    const atencao = [];

    window.allItems.forEach(item => {
        if (!item.expirationDate) return;
        const st = getExpirationStatus(item.expirationDate);
        const name = item.name + ' (' + (translations[currentLang][item.type] || item.type) + '): ' + formatDateWithoutTimezone(item.expirationDate);
        if (st.daysLeft !== null && st.daysLeft < 0) vencidos.push(name);
        else if (st.daysLeft !== null && st.daysLeft <= 7) criticos.push(name);
        else if (st.daysLeft !== null && st.daysLeft <= 30) atencao.push(name);
    });

    if (vencidos.length > 0 || criticos.length > 0 || atencao.length > 0) {
        const list = document.getElementById('expiringItemsList');
        list.innerHTML = '';

        const renderSection = (title, items, colorClass) => {
            if (items.length === 0) return;
            const header = document.createElement('li');
            header.innerHTML = `<strong class="${colorClass}">${title}</strong>`;
            header.style.listStyle = 'none';
            header.style.marginBottom = '4px';
            list.appendChild(header);
            items.forEach(name => {
                const li = document.createElement('li');
                li.textContent = name;
                li.classList.add(colorClass);
                list.appendChild(li);
            });
            const sep = document.createElement('li');
            sep.style.listStyle = 'none';
            sep.innerHTML = '<hr style="border-color:#5a6a5a;margin:8px 0">';
            list.appendChild(sep);
        };

        renderSection('🔴 VENCIDOS — Avalie e descarte se necessário', vencidos, 'text-expired');
        renderSection('🟠 CRÍTICOS — Consumir imediatamente (≤ 7 dias)', criticos, 'text-critical');
        renderSection('🟡 ATENÇÃO — Consumir primeiro (8–30 dias)', atencao, 'text-warning-custom');

        const modal = new bootstrap.Modal(document.getElementById('expirationModal'));
        modal.show();
    }
}

// ---- Formulário: Adicionar / Editar Item ----

document.getElementById('itemForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const itemName = document.getElementById('itemName').value.trim();
    const itemType = document.getElementById('itemType').value;
    const mass = document.getElementById('mass').value || '';
    const unit = document.getElementById('unit').value || '';
    const expirationDate = document.getElementById('expirationDate').value || '';
    const editIndex = document.getElementById('editIndex').value;

    if (!itemName) {
        alert(translations[currentLang].nameRequiredAlert);
        document.getElementById('itemName').focus();
        return;
    }

    const semValidade = ['ferramentas', 'equipamento', 'utensilio'];
    if (!semValidade.includes(itemType)) {
        if (!mass || !unit || !expirationDate) {
            alert(translations[currentLang].requiredFieldsAlert);
            if (!mass) document.getElementById('mass').focus();
            else if (!unit) document.getElementById('unit').focus();
            else if (!expirationDate) document.getElementById('expirationDate').focus();
            return;
        }
        // Permitir datas vencidas (para registrar itens já vencidos no estoque)
        const dateObj = new Date(expirationDate);
        if (isNaN(dateObj.getTime())) {
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
        expirationDate: expirationDate,
        createdAt: new Date().toISOString()
    };

    if (editIndex) {
        item.id = parseInt(editIndex);
        const request = objectStore.put(item);
        request.onsuccess = function () {
            loadItems();
            resetForm();
            autoBackup();
        };
    } else {
        const request = objectStore.add(item);
        request.onsuccess = function () {
            loadItems();
            resetForm();
            autoBackup();
        };
    }

    transaction.onerror = function (event) {
        console.error('Erro ao salvar item:', event.target.error);
    };
});

// ---- Editar Item ----

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
};

// ---- Excluir Item ----

window.deleteItem = function (id) {
    playClickSound();
    if (confirm(translations[currentLang].confirmDelete)) {
        const transaction = db.transaction(['items'], 'readwrite');
        const objectStore = transaction.objectStore('items');
        const request = objectStore.delete(id);

        request.onsuccess = function () {
            loadItems();
            autoBackup();
        };

        request.onerror = function (event) {
            console.error('Erro ao excluir item:', event.target.error);
        };
    }
};

// ---- Resetar Formulário ----

function resetForm() {
    document.getElementById('itemForm').reset();
    document.getElementById('editIndex').value = '';
    document.getElementById('submitButton').textContent = translations[currentLang].addItem;
    document.getElementById('itemName').focus();
}

// ---- Ordenação ----

let lastSortField = 'expirationDate'; // FIFO padrão
let lastSortDirection = 'asc';

window.sortItems = function (field, direction) {
    playClickSound();
    lastSortField = field;
    lastSortDirection = direction;
    applyFiltersAndSort();
};

// ---- Filtros e Renderização da Tabela ----

window.applyFiltersAndSort = function () {
    if (lastSortField && lastSortDirection) {
        window.allItems.sort((a, b) => {
            let valueA = a[lastSortField] || '';
            let valueB = b[lastSortField] || '';

            if (lastSortField === 'expirationDate') {
                // Itens sem data vão para o final
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

    const tableBody = document.getElementById('itemTableBody');
    tableBody.innerHTML = '';

    window.allItems.forEach(item => {
        const st = getExpirationStatus(item.expirationDate);
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.id);
        if (st.rowClass) row.classList.add(st.rowClass);

        const massCell = item.mass
            ? item.mass + ' ' + (translations[currentLang][item.unit] || item.unit)
            : '-';

        const dateCellContent = item.expirationDate
            ? formatDateWithoutTimezone(item.expirationDate)
            : '-';

        row.innerHTML =
            '<td>' + escapeHtml(item.name) + '</td>' +
            '<td>' + (translations[currentLang][item.type] || item.type) + '</td>' +
            '<td>' + escapeHtml(massCell) + '</td>' +
            '<td>' + dateCellContent + '</td>' +
            '<td class="text-center align-middle">' +
            '<div class="table-actions-stack">' +
            '<button class="btn btn-sm btn-warning btn-table-action" onclick="editItem(' + item.id + ')" title="' + (translations[currentLang].edit || 'Editar') + '" aria-label="' + (translations[currentLang].edit || 'Editar') + '" data-bs-toggle="tooltip" data-bs-placement="left">' +
            '<i class="fa-solid fa-pen"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-danger btn-table-action" onclick="deleteItem(' + item.id + ')" title="' + (translations[currentLang].delete || 'Excluir') + '" aria-label="' + (translations[currentLang].delete || 'Excluir') + '" data-bs-toggle="tooltip" data-bs-placement="left">' +
            '<i class="fa-solid fa-trash-can"></i>' +
            '</button>' +
            '</div>' +
            '</td>';

        tableBody.appendChild(row);
    });
    initTooltips();
};

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---- Backup JSON Automático ----

function autoBackup() {
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

        // Nome com data local — mesmo arquivo por dia
        const now = new Date();
        const dateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
        a.download = 'survival-backup-' + dateStr + '.json';

        // Download silencioso
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
}

// Backup manual via botão
window.backupManual = function () {
    playClickSound();
    autoBackup();
};

// Backup ao fechar a aba/janela
window.addEventListener('beforeunload', function () {
    if (window.allItems && window.allItems.length > 0) {
        autoBackup();
    }
});

// ---- Exportar / Importar JSON ----

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
};

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

// ---- Dashboard ----

let typeChartInstance = null;
let expirationChartInstance = null;
let itemQuantityChartInstance = null;
let totalMassChartInstance = null;
window.isDashboardOpen = false;

window.showDashboard = function () {
    playClickSound();
    const modal = new bootstrap.Modal(document.getElementById('dashboardModal'));
    modal.show();
};

document.getElementById('dashboardModal').addEventListener('shown.bs.modal', function () {
    window.isDashboardOpen = true;
    generateCharts();
});

document.getElementById('dashboardModal').addEventListener('hidden.bs.modal', function () {
    window.isDashboardOpen = false;
});

function generateCharts() {
    const today = new Date();
    const expiringItems = window.allItems.filter(item => {
        if (!item.expirationDate) return false;
        const st = getExpirationStatus(item.expirationDate);
        return st.daysLeft !== null && st.daysLeft <= 30 && st.daysLeft >= 0;
    });

    if (typeChartInstance) typeChartInstance.destroy();
    if (expirationChartInstance) expirationChartInstance.destroy();
    if (itemQuantityChartInstance) itemQuantityChartInstance.destroy();
    if (totalMassChartInstance) totalMassChartInstance.destroy();

    // Gráfico: Quantidade por tipo
    const typeCounts = {};
    window.allItems.forEach(item => {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });

    typeChartInstance = new Chart(document.getElementById('typeChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(typeCounts).map(t => translations[currentLang][t] || t),
            datasets: [{
                label: translations[currentLang].quantityByType,
                data: Object.values(typeCounts),
                backgroundColor: '#d4a017',
                borderColor: '#b88c14',
                borderWidth: 1
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, title: { display: true, text: translations[currentLang].quantity } } },
            plugins: { legend: { labels: { color: '#f5f5f5' } } }
        }
    });

    // Gráfico: Status de validade
    const countVencido = window.allItems.filter(i => i.expirationDate && getExpirationStatus(i.expirationDate).daysLeft < 0).length;
    const countCritico = window.allItems.filter(i => i.expirationDate && getExpirationStatus(i.expirationDate).daysLeft >= 0 && getExpirationStatus(i.expirationDate).daysLeft <= 7).length;
    const countAtencao = window.allItems.filter(i => i.expirationDate && getExpirationStatus(i.expirationDate).daysLeft > 7 && getExpirationStatus(i.expirationDate).daysLeft <= 30).length;
    const countOk = window.allItems.filter(i => i.expirationDate && getExpirationStatus(i.expirationDate).daysLeft > 30).length;
    const countSemData = window.allItems.filter(i => !i.expirationDate).length;

    expirationChartInstance = new Chart(document.getElementById('expirationChart'), {
        type: 'pie',
        data: {
            labels: ['🔴 Vencido', '🟠 Crítico (≤7d)', '🟡 Atenção (≤30d)', '🟢 OK', '⚪ Sem validade'],
            datasets: [{
                data: [countVencido, countCritico, countAtencao, countOk, countSemData],
                backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#6c757d'],
                borderWidth: 1
            }]
        },
        options: { plugins: { legend: { labels: { color: '#f5f5f5' } } } }
    });

    // Gráfico: Quantidade de itens iguais
    const itemCounts = {};
    window.allItems.forEach(item => {
        const key = item.name + ' (' + (item.mass || '-') + ' ' + (translations[currentLang][item.unit] || item.unit || '-') + ')';
        itemCounts[key] = (itemCounts[key] || 0) + 1;
    });

    itemQuantityChartInstance = new Chart(document.getElementById('itemQuantityChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(itemCounts),
            datasets: [{
                label: translations[currentLang].quantityOfItems,
                data: Object.values(itemCounts),
                backgroundColor: '#d4a017',
                borderColor: '#b88c14',
                borderWidth: 1
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, title: { display: true, text: translations[currentLang].quantity } } },
            plugins: { legend: { labels: { color: '#f5f5f5' } } }
        }
    });

    // Gráfico: Massa/Volume total por produto
    const productTotals = {};
    window.allItems.forEach(item => {
        if (['alimento', 'limpeza-higiene', 'agua'].includes(item.type) && item.mass && item.unit) {
            const key = item.name + ' (' + item.unit + ')';
            if (!productTotals[key]) {
                productTotals[key] = { name: item.name, totalMass: 0, unit: item.unit };
            }
            let mass = parseFloat(item.mass);
            if (item.unit === 'kilograma') { mass *= 1000; productTotals[key].unit = 'grama'; }
            else if (item.unit === 'litro') { mass *= 1000; productTotals[key].unit = 'mililitro'; }
            productTotals[key].totalMass += mass;
        }
    });

    totalMassChartInstance = new Chart(document.getElementById('totalMassChart'), {
        type: 'bar',
        data: {
            labels: Object.values(productTotals).map(d => d.name + ' (' + (translations[currentLang][d.unit] || d.unit) + ')'),
            datasets: [{
                label: translations[currentLang].totalMassByProduct,
                data: Object.values(productTotals).map(d => d.totalMass),
                backgroundColor: '#d4a017',
                borderColor: '#b88c14',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: translations[currentLang].mass } },
                x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } }
            },
            plugins: { legend: { labels: { color: '#f5f5f5' } } }
        }
    });
}

// ---- Som ----

function playClickSound() {
    const clickSound = document.getElementById('clickSound');
    if (!clickSound) return;
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
}

// ---- Inicialização ----

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('appLogo').addEventListener('click', function () {
        const logoContainer = document.getElementById('logoContainer');
        logoContainer.style.opacity = '0';
        setTimeout(() => {
            logoContainer.style.display = 'none';
            const welcomeScreen = document.getElementById('welcomeScreen');
            if (welcomeScreen) {
                welcomeScreen.classList.remove('d-none');
                setTimeout(() => welcomeScreen.classList.add('visible'), 10);
            }
        }, 500);
    });

    window.enterApp = function () {
        const welcomeScreen = document.getElementById('welcomeScreen');
        welcomeScreen.classList.remove('visible');
        welcomeScreen.style.opacity = '0';
        setTimeout(() => welcomeScreen.classList.add('d-none'), 1000);

        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.classList.remove('d-none');
            setTimeout(() => {
                mainApp.classList.add('visible');
                checkExpirationDates();
            }, 10);
            document.getElementById('languageSelector').classList.remove('d-none');
        }
        initTooltips();
    };

    initTooltips();
});

// ---- Tooltips do Bootstrap ----
function initTooltips() {
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            const inst = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (inst) inst.dispose();
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

// ---- Scroll to Top ----

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
        backToTop.classList.toggle('visible', window.scrollY > 300);
    }
});

// ============================================================
// SISTEMA DE TRADUÇÃO
// ============================================================

const translations = {
    pt: {
        appTitle: 'Gerenciamento de Estoque - Sobrevivencialismo',
        welcomeTitle: 'Bem-vindo ao Gerenciamento de Estoque - Sobrevivencialismo',
        welcomeMessage: 'Prepare-se para gerenciar seu estoque de forma eficiente e segura!',
        enterApp: 'Entrar',
        mainTitle: 'Gerenciamento de Estoque - Sobrevivencialismo',
        itemNameLabel: 'Nome do Item',
        itemNamePlaceholder: 'Ex: Arroz',
        itemTypeLabel: 'Tipo do Item',
        selectTypePlaceholder: 'Selecione o tipo',
        alimento: 'Alimento',
        'limpeza-higiene': 'Limpeza e Higiene',
        ferramentas: 'Ferramentas',
        agua: 'Água',
        equipamento: 'Equipamento',
        utensilio: 'Utensílio',
        massLabel: 'Massa/Volume',
        massPlaceholder: 'Ex: 1.5',
        unitLabel: 'Unidade',
        selectUnitPlaceholder: 'Selecione a unidade',
        grama: 'Grama',
        kilograma: 'Kilograma',
        litro: 'Litro',
        mililitro: 'Mililitro',
        expirationDateLabel: 'Data de Validade',
        addItem: 'Cadastrar Item',
        updateItem: 'Atualizar Item',
        dynamicFilterLabel: 'Pesquisa Dinâmica (ex: nome tipo data)',
        dynamicFilterPlaceholder: 'Ex: Arroz alimento 2025-06-01',
        exportButton: 'Exportar JSON',
        importFileLabel: 'Importar de JSON',
        pdfButton: 'Relatório PDF',
        dashboardButton: 'Dashboard',
        backupButton: 'Fazer Backup',
        calcButton: 'Calculadora',
        guiaButton: 'Guia Sobrevivência',
        exportTooltip: 'Exportar para JSON',
        importTooltip: 'Importar de JSON',
        backupTooltip: 'Salvar backup JSON local agora',
        tableNameHeader: 'Nome',
        tableTypeHeader: 'Tipo',
        tableMassHeader: 'Massa/Volume',
        tableExpirationHeader: 'Validade',
        tableStatusHeader: 'Status',
        tableActionsHeader: 'Ações',
        edit: 'Editar',
        delete: 'Excluir',
        expirationModalLabel: 'Aviso: Situação do Estoque',
        expirationMessage: 'Verifique os itens abaixo:',
        closeModalButton: 'Fechar',
        dashboardModalLabel: 'Dashboard de Estoque',
        closeDashboardButton: 'Fechar',
        quantityByType: 'Quantidade por Tipo',
        quantity: 'Quantidade',
        expiringSoon: 'Próximos de Vencer',
        valid: 'Válidos',
        quantityOfItems: 'Quantidade de Itens Iguais',
        totalMassByProduct: 'Massa Total por Produto',
        mass: 'Massa/Volume',
        requiredFieldsAlert: 'Preencha todos os campos obrigatórios!',
        nameRequiredAlert: 'O nome do item é obrigatório!',
        invalidExpirationDateAlert: 'A data de validade é inválida!',
        confirmDelete: 'Tem certeza que deseja excluir este item?',
        importSuccess: 'Dados importados com sucesso!',
        importError: 'Erro ao importar o arquivo JSON: '
    },
    en: {
        appTitle: 'Stock Management - Survivalism',
        welcomeTitle: 'Welcome to Stock Management - Survivalism',
        welcomeMessage: 'Get ready to manage your stock efficiently and safely!',
        enterApp: 'Enter',
        mainTitle: 'Stock Management - Survivalism',
        itemNameLabel: 'Item Name',
        itemNamePlaceholder: 'Ex: Rice',
        itemTypeLabel: 'Item Type',
        selectTypePlaceholder: 'Select the type',
        alimento: 'Food',
        'limpeza-higiene': 'Cleaning and Hygiene',
        ferramentas: 'Tools',
        agua: 'Water',
        equipamento: 'Equipment',
        utensilio: 'Utensil',
        massLabel: 'Mass/Volume',
        massPlaceholder: 'Ex: 1.5',
        unitLabel: 'Unit',
        selectUnitPlaceholder: 'Select the unit',
        grama: 'Gram',
        kilograma: 'Kilogram',
        litro: 'Liter',
        mililitro: 'Milliliter',
        expirationDateLabel: 'Expiration Date',
        addItem: 'Add Item',
        updateItem: 'Update Item',
        dynamicFilterLabel: 'Dynamic Search (e.g., name type date)',
        dynamicFilterPlaceholder: 'Ex: Rice food 2025-06-01',
        exportButton: 'Export JSON',
        importFileLabel: 'Import from JSON',
        pdfButton: 'PDF Report',
        dashboardButton: 'Dashboard',
        backupButton: 'Backup Now',
        calcButton: 'Calculator',
        guiaButton: 'Survival Guide',
        exportTooltip: 'Export to JSON',
        importTooltip: 'Import from JSON',
        backupTooltip: 'Save local JSON backup now',
        tableNameHeader: 'Name',
        tableTypeHeader: 'Type',
        tableMassHeader: 'Mass/Volume',
        tableExpirationHeader: 'Expiration',
        tableStatusHeader: 'Status',
        tableActionsHeader: 'Actions',
        edit: 'Edit',
        delete: 'Delete',
        expirationModalLabel: 'Alert: Stock Status',
        expirationMessage: 'Check the items below:',
        closeModalButton: 'Close',
        dashboardModalLabel: 'Stock Dashboard',
        closeDashboardButton: 'Close',
        quantityByType: 'Quantity by Type',
        quantity: 'Quantity',
        expiringSoon: 'Expiring Soon',
        valid: 'Valid',
        quantityOfItems: 'Quantity of Identical Items',
        totalMassByProduct: 'Total Mass by Product',
        mass: 'Mass/Volume',
        requiredFieldsAlert: 'Fill in all required fields!',
        nameRequiredAlert: 'The item name is required!',
        invalidExpirationDateAlert: 'The expiration date is invalid!',
        confirmDelete: 'Are you sure you want to delete this item?',
        importSuccess: 'Data imported successfully!',
        importError: 'Error importing JSON file: '
    },
    es: {
        appTitle: 'Gestión de Inventario - Supervivencia',
        welcomeTitle: 'Bienvenido a la Gestión de Inventario - Supervivencia',
        welcomeMessage: '¡Prepárate para gestionar tu inventario de manera eficiente y segura!',
        enterApp: 'Entrar',
        mainTitle: 'Gestión de Inventario - Supervivencia',
        itemNameLabel: 'Nombre del Ítem',
        itemNamePlaceholder: 'Ej: Arroz',
        itemTypeLabel: 'Tipo de Ítem',
        selectTypePlaceholder: 'Selecciona el tipo',
        alimento: 'Alimento',
        'limpeza-higiene': 'Limpieza e Higiene',
        ferramentas: 'Herramientas',
        agua: 'Agua',
        equipamento: 'Equipo',
        utensilio: 'Utensilio',
        massLabel: 'Masa/Volumen',
        massPlaceholder: 'Ej: 1.5',
        unitLabel: 'Unidad',
        selectUnitPlaceholder: 'Selecciona la unidad',
        grama: 'Gramo',
        kilograma: 'Kilogramo',
        litro: 'Litro',
        mililitro: 'Mililitro',
        expirationDateLabel: 'Fecha de Vencimiento',
        addItem: 'Agregar Ítem',
        updateItem: 'Actualizar Ítem',
        dynamicFilterLabel: 'Búsqueda Dinámica (ej: nombre tipo fecha)',
        dynamicFilterPlaceholder: 'Ej: Arroz alimento 2025-06-01',
        exportButton: 'Exportar JSON',
        importFileLabel: 'Importar desde JSON',
        pdfButton: 'Informe PDF',
        dashboardButton: 'Panel',
        backupButton: 'Hacer Copia',
        calcButton: 'Calculadora',
        guiaButton: 'Guía Supervivencia',
        exportTooltip: 'Exportar a JSON',
        importTooltip: 'Importar de JSON',
        backupTooltip: 'Guardar copia de seguridad local JSON ahora',
        tableNameHeader: 'Nombre',
        tableTypeHeader: 'Tipo',
        tableMassHeader: 'Masa/Volumen',
        tableExpirationHeader: 'Vencimiento',
        tableStatusHeader: 'Estado',
        tableActionsHeader: 'Acciones',
        edit: 'Editar',
        delete: 'Eliminar',
        expirationModalLabel: 'Alerta: Estado del Inventario',
        expirationMessage: 'Verifique los ítems a continuación:',
        closeModalButton: 'Cerrar',
        dashboardModalLabel: 'Panel de Inventario',
        closeDashboardButton: 'Cerrar',
        quantityByType: 'Cantidad por Tipo',
        quantity: 'Cantidad',
        expiringSoon: 'Próximos a Vencer',
        valid: 'Válidos',
        quantityOfItems: 'Cantidad de Ítems Idénticos',
        totalMassByProduct: 'Masa Total por Producto',
        mass: 'Masa/Volumen',
        requiredFieldsAlert: '¡Completa todos los campos obligatorios!',
        nameRequiredAlert: '¡El nombre del ítem es obligatorio!',
        invalidExpirationDateAlert: '¡La fecha de vencimiento es inválida!',
        confirmDelete: '¿Estás seguro de que deseas eliminar este ítem?',
        importSuccess: '¡Datos importados con éxito!',
        importError: 'Error al importar el archivo JSON: '
    },
    zh: {
        appTitle: '库存管理 - 生存主义',
        welcomeTitle: '欢迎使用库存管理 - 生存主义',
        welcomeMessage: '准备好高效、安全地管理你的库存吧！',
        enterApp: '进入',
        mainTitle: '库存管理 - 生存主义',
        itemNameLabel: '物品名称',
        itemNamePlaceholder: '例：大米',
        itemTypeLabel: '物品类型',
        selectTypePlaceholder: '选择类型',
        alimento: '食品',
        'limpeza-higiene': '清洁与卫生',
        ferramentas: '工具',
        agua: '水',
        equipamento: '设备',
        utensilio: '器具',
        massLabel: '质量/体积',
        massPlaceholder: '例：1.5',
        unitLabel: '单位',
        selectUnitPlaceholder: '选择单位',
        grama: '克',
        kilograma: '千克',
        litro: '升',
        mililitro: '毫升',
        expirationDateLabel: '有效期',
        addItem: '添加物品',
        updateItem: '更新物品',
        dynamicFilterLabel: '动态搜索（例：名称 类型 日期）',
        dynamicFilterPlaceholder: '例：大米 食品 2025-06-01',
        exportButton: '导出 JSON',
        importFileLabel: '从 JSON 导入',
        pdfButton: 'PDF 报告',
        dashboardButton: '仪表板',
        backupButton: '立即备份',
        calcButton: '计算器',
        guiaButton: '生存指南',
        exportTooltip: '导出为 JSON',
        importTooltip: '从 JSON 导入',
        backupTooltip: '立即保存本地 JSON 备份',
        tableNameHeader: '名称',
        tableTypeHeader: '类型',
        tableMassHeader: '质量/体积',
        tableExpirationHeader: '有效期',
        tableStatusHeader: '状态',
        tableActionsHeader: '操作',
        edit: '编辑',
        delete: '删除',
        expirationModalLabel: '警告：库存状态',
        expirationMessage: '请检查以下物品：',
        closeModalButton: '关闭',
        dashboardModalLabel: '库存仪表板',
        closeDashboardButton: '关闭',
        quantityByType: '按类型统计数量',
        quantity: '数量',
        expiringSoon: '即将过期',
        valid: '有效',
        quantityOfItems: '相同物品数量',
        totalMassByProduct: '按产品统计总质量',
        mass: '质量/体积',
        requiredFieldsAlert: '请填写所有必填字段！',
        nameRequiredAlert: '物品名称为必填项！',
        invalidExpirationDateAlert: '有效期无效！',
        confirmDelete: '你确定要删除这个物品吗？',
        importSuccess: '数据导入成功！',
        importError: '导入 JSON 文件时出错：'
    }
};

const langLabels = {
    pt: 'PT',
    en: 'EN',
    es: 'ES',
    zh: 'ZH'
};

let currentLang = 'pt';

window.selectLanguage = function (lang) {
    playClickSound();
    changeLanguage(lang);
};

function changeLanguage(lang) {
    currentLang = lang;
    
    // Atualiza a label do botão de idioma e a seleção ativa
    const labelSpan = document.getElementById('currentLangLabel');
    if (labelSpan) {
        labelSpan.textContent = langLabels[lang] || lang.toUpperCase();
    }
    document.querySelectorAll('#languageSelector .dropdown-item').forEach(item => {
        if (item.getAttribute('data-lang') === lang) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

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
        option.textContent = translations[lang][option.getAttribute('data-lang-key')];
    });
    document.getElementById('massLabel').textContent = translations[lang].massLabel;
    document.getElementById('mass').placeholder = translations[lang].massPlaceholder;
    document.getElementById('unitLabel').textContent = translations[lang].unitLabel;
    document.getElementById('selectUnitPlaceholder').textContent = translations[lang].selectUnitPlaceholder;
    document.querySelectorAll('#unit option[data-lang-key]').forEach(option => {
        option.textContent = translations[lang][option.getAttribute('data-lang-key')];
    });
    document.getElementById('expirationDateLabel').textContent = translations[lang].expirationDateLabel;
    document.getElementById('submitButton').textContent = translations[lang].addItem;
    document.getElementById('dynamicFilterLabel').textContent = translations[lang].dynamicFilterLabel;
    document.getElementById('dynamicFilter').placeholder = translations[lang].dynamicFilterPlaceholder;
    // Atualiza labels dos botões de ações rápidas simétricos
    const backupBtnLbl = document.getElementById('backupButtonLabel');
    if (backupBtnLbl) backupBtnLbl.textContent = translations[lang].backupButton;

    const pdfBtnLbl = document.getElementById('pdfButtonLabel');
    if (pdfBtnLbl) pdfBtnLbl.textContent = translations[lang].pdfButton;

    const dashBtnLbl = document.getElementById('dashboardButtonLabel');
    if (dashBtnLbl) dashBtnLbl.textContent = translations[lang].dashboardButton;

    const calcBtnLbl = document.getElementById('calcButtonLabel');
    if (calcBtnLbl) calcBtnLbl.textContent = translations[lang].calcButton;

    const guiaBtnLbl = document.getElementById('guiaButtonLabel');
    if (guiaBtnLbl) guiaBtnLbl.textContent = translations[lang].guiaButton;

    // Atualiza tooltips
    const exportBtn = document.getElementById('exportButton');
    if (exportBtn) {
        exportBtn.setAttribute('title', translations[lang].exportTooltip);
        exportBtn.setAttribute('data-bs-original-title', translations[lang].exportTooltip);
    }

    const importTriggerBtn = document.getElementById('importTriggerButton');
    if (importTriggerBtn) {
        importTriggerBtn.setAttribute('title', translations[lang].importTooltip);
        importTriggerBtn.setAttribute('data-bs-original-title', translations[lang].importTooltip);
    }

    const backupBtn = document.getElementById('backupButton');
    if (backupBtn) {
        backupBtn.setAttribute('title', translations[lang].backupTooltip);
        backupBtn.setAttribute('data-bs-original-title', translations[lang].backupTooltip);
    }

    initTooltips();
    document.getElementById('tableNameHeader').childNodes[0].textContent = translations[lang].tableNameHeader;
    document.getElementById('tableTypeHeader').textContent = translations[lang].tableTypeHeader;
    document.getElementById('tableMassHeader').textContent = translations[lang].tableMassHeader;
    document.getElementById('tableExpirationHeader').childNodes[0].textContent = translations[lang].tableExpirationHeader;
    document.getElementById('tableStatusHeader').textContent = translations[lang].tableStatusHeader;
    document.getElementById('tableActionsHeader').textContent = translations[lang].tableActionsHeader;
    document.getElementById('expirationModalLabel').textContent = translations[lang].expirationModalLabel;
    document.getElementById('expirationMessage').textContent = translations[lang].expirationMessage;
    document.getElementById('closeModalButton').textContent = translations[lang].closeModalButton;
    document.getElementById('dashboardModalLabel').textContent = translations[lang].dashboardModalLabel;
    document.getElementById('closeDashboardButton').textContent = translations[lang].closeDashboardButton;

    applyFiltersAndSort();
    if (window.isDashboardOpen) generateCharts();
}

// Som global em todos os botões
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', playClickSound);
});

// ============================================================
// Guia de Sobrevivência — Survival Manager
// Baseado no "Manual de Sobrevivência na Selva"
// (US Armed Forces Survival Manual, tradução PT)
// Conteúdo embutido — funciona 100% offline
// ============================================================

window.abrirGuia = function () {
    playClickSound();
    const modal = new bootstrap.Modal(document.getElementById('guiaModal'));
    modal.show();
};

// O conteúdo do guia está embutido no HTML do modal (guiaModal)
// Esta função inicializa o comportamento das abas e navegação
document.addEventListener('DOMContentLoaded', function () {
    // Ativar primeira aba ao abrir o modal
    document.getElementById('guiaModal').addEventListener('shown.bs.modal', function () {
        const primeiraAba = document.querySelector('#guiaTabs .nav-link');
        if (primeiraAba) bootstrap.Tab.getOrCreateInstance(primeiraAba).show();
    });
});

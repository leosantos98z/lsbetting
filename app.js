// ======================= VARIÁVEIS GLOBAIS =======================
let idApostaEmEdicao = null;
let meuGrafico = null;
let chartView = 'daily'; // 'daily' ou 'monthly'
let filtrosAtuais = {
    nome: '',
    casa: 'todas',
    tipo: 'todos', // Adicionado
    status: 'todos'
};

// ======================= CONFIGURAÇÃO DO SUPABASE =======================
const SUPABASE_URL = 'https://veswuzzftcqvpxfqithr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlc3d1enpmdGNxdnB4ZnFpdGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTk2MjAsImV4cCI6MjA3Mjg3NTYyMH0.W630ZPEZ25TmIZOL0OjbBIBRUgaT6REiSSILzuBVK4g';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ======================= LÓGICA PRINCIPAL DA APLICAÇÃO =======================
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SELETORES DE ELEMENTOS ---
    const novaApostaBtn = document.getElementById('novaApostaBtn');
    const novaApostaHeaderBtn = document.getElementById('novaApostaHeaderBtn');
    const modal = document.getElementById('modalNovaAposta');
    const fecharModalBtn = document.getElementById('fecharModalBtn');
    const cancelarBtn = document.getElementById('cancelarBtn');
    const formNovaAposta = document.getElementById('formNovaAposta');
    const betsListContainer = document.querySelector('.bets-list');
    const filtroNomeInput = document.getElementById('filtroNome');
    const filtroCasaSelect = document.getElementById('filtroCasa');
    const filtroTipoSelect = document.getElementById('filtroTipo'); // Adicionado
    const filtroStatusSelect = document.getElementById('filtroStatus');
    const limparFiltrosBtn = document.getElementById('limparFiltrosBtn');
    const chartDailyBtn = document.getElementById('chartDailyBtn');
    const chartMonthlyBtn = document.getElementById('chartMonthlyBtn');
    const chartTitle = document.getElementById('chartTitle');
    const notasTextarea = document.getElementById('notasTextarea');

    // --- 2. FUNÇÕES ---

    async function carregarApostas() {
        let query = supabaseClient.from('apostas').select('*');

        if (filtrosAtuais.nome) {
            query = query.ilike('nome_conta', `%${filtrosAtuais.nome}%`);
        }
        if (filtrosAtuais.casa && filtrosAtuais.casa !== 'todas') {
            query = query.eq('casa_apostas', filtrosAtuais.casa);
        }
        if (filtrosAtuais.tipo && filtrosAtuais.tipo !== 'todos') { // Adicionado
            query = query.eq('tipo_aposta', filtrosAtuais.tipo);
        }
        if (filtrosAtuais.status && filtrosAtuais.status !== 'todos') {
            query = query.eq('status', filtrosAtuais.status);
        }

        query = query.order('id', { ascending: false });
        const { data: apostas, error } = await query;

        if (error) {
            console.error('Erro ao buscar apostas:', error);
            return;
        }

        renderizarLista(apostas);
        atualizarPainelResumo(apostas);
        renderizarGrafico(apostas);
        
        if (filtrosAtuais.casa === 'todas') {
             preencherFiltroCasas(apostas);
        }
    }

    function renderizarLista(apostas) {
        betsListContainer.querySelectorAll('.grid-row').forEach(row => row.remove());
        const emptyState = betsListContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        if (apostas.length === 0) {
            betsListContainer.insertAdjacentHTML('beforeend', `
                <div class="empty-state">
                    <p>Nenhuma aposta encontrada com os filtros aplicados.</p>
                </div>`);
        } else {
            apostas.forEach(aposta => {
                const apostaElement = document.createElement('div');
                apostaElement.classList.add('grid-row');
                
                const dataFormatada = aposta.data ? new Date(aposta.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
                const resultado = aposta.resultado_lucro_total || 0;
                const resultadoClasse = resultado > 0 ? 'resultado-positivo' : resultado < 0 ? 'resultado-negativo' : '';
                const statusClass = (aposta.status || '').toLowerCase().replace(/ /g, '-').replace('ú', 'u');

                apostaElement.innerHTML = `
                    <div class="grid-cell">${aposta.id}</div>
                    <div class="grid-cell">${dataFormatada}</div>
                    <div class="grid-cell">${aposta.nome_conta || '-'}</div>
                    <div class="grid-cell">${aposta.casa_apostas || '-'}</div>
                    <div class="grid-cell">${aposta.observacao1 || '-'}</div>
                    <div class="grid-cell ${resultadoClasse}">
                        ${resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div class="grid-cell">${aposta.tipo_aposta || '-'}</div>
                    <div class="grid-cell">
                        <span class="status-badge status-${statusClass}">${aposta.status}</span>
                    </div>
                    <div class="grid-cell action-buttons">
                        <button class="action-btn btn-edit" title="Editar Aposta" data-id="${aposta.id}">✏️</button>
                        <button class="action-btn btn-delete" title="Excluir Aposta" data-id="${aposta.id}">🗑️</button>
                    </div>
                `;
                betsListContainer.appendChild(apostaElement);
            });
        }
    }

    function atualizarPainelResumo(apostas) {
        const lucroTotalEl = document.getElementById('lucroTotalValue');
        const lucroMedioEl = document.getElementById('lucroMedioValue');
        const apostasAndamentoEl = document.getElementById('apostasAndamentoValue');
        const apostasConcluidasEl = document.getElementById('apostasConcluidasValue');

        const concluidas = apostas.filter(aposta => aposta.status === 'Concluído');
        const emAndamento = apostas.filter(aposta => aposta.status === 'Em andamento');
        
        const lucroTotal = concluidas.reduce((total, aposta) => total + (aposta.resultado_lucro_total || 0), 0);
        const lucroMedio = concluidas.length > 0 ? lucroTotal / concluidas.length : 0;
        
        const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        lucroTotalEl.textContent = formatarMoeda(lucroTotal);
        lucroMedioEl.textContent = formatarMoeda(lucroMedio);
        apostasConcluidasEl.textContent = concluidas.length;
        apostasAndamentoEl.textContent = emAndamento.length;
    }

    function renderizarGrafico(apostas) {
        const ctx = document.getElementById('graficoLucroDiario').getContext('2d');
        if (meuGrafico) {
            meuGrafico.destroy();
        }

        let chartConfig;

        if (chartView === 'daily') {
            chartTitle.textContent = 'Lucro Diário';
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();
            const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
            const lucrosPorDia = Array(diasNoMes).fill(0);

            const apostasDoMes = apostas.filter(aposta => {
                if (!aposta.data) return false;
                const dataAposta = new Date(aposta.data + 'T00:00:00');
                return aposta.status === 'Concluído' && dataAposta.getMonth() === mesAtual && dataAposta.getFullYear() === anoAtual;
            });

            let maiorLucroDiario = 0;
            apostasDoMes.forEach(aposta => {
                const dia = new Date(aposta.data + 'T00:00:00').getDate();
                if (aposta.resultado_lucro_total) {
                    lucrosPorDia[dia - 1] += aposta.resultado_lucro_total;
                }
                if (lucrosPorDia[dia - 1] > maiorLucroDiario) {
                    maiorLucroDiario = lucrosPorDia[dia - 1];
                }
            });

            const topoGrafico = Math.ceil(maiorLucroDiario / 100) * 100;
            const labels = Array.from({ length: diasNoMes }, (_, i) => (i + 1).toString().padStart(2, '0'));

            chartConfig = getChartConfig(labels, lucrosPorDia, 'Diário', mesAtual, topoGrafico > 0 ? topoGrafico : 100);

        } else if (chartView === 'monthly') {
            chartTitle.textContent = 'Lucro Mensal';
            const lucrosPorMes = {};
            const apostasConcluidas = apostas.filter(a => a.status === 'Concluído' && a.data);

            apostasConcluidas.forEach(aposta => {
                const dataAposta = new Date(aposta.data + 'T00:00:00');
                const mesKey = `${dataAposta.getFullYear()}-${String(dataAposta.getMonth()).padStart(2, '0')}`;
                lucrosPorMes[mesKey] = (lucrosPorMes[mesKey] || 0) + (aposta.resultado_lucro_total || 0);
            });

            const mesesOrdenados = Object.keys(lucrosPorMes).sort();
            const labels = mesesOrdenados.map(key => {
                const [ano, mes] = key.split('-');
                return new Date(ano, mes).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            });
            const data = mesesOrdenados.map(key => lucrosPorMes[key]);

            const maiorLucroMensal = Math.max(...data, 0);
            const topoGrafico = Math.ceil(maiorLucroMensal / 1000) * 1000;

            chartConfig = getChartConfig(labels, data, 'Mensal', null, topoGrafico > 0 ? topoGrafico : 1000);
        }

        meuGrafico = new Chart(ctx, chartConfig);
    }

    function getChartConfig(labels, data, tipoTooltip, mesAtual, maximoY) {
        return {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Lucro ${tipoTooltip}`,
                    data: data,
                    backgroundColor: 'rgba(250, 204, 21, 1)',
                    borderColor: 'rgba(250, 204, 21, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: maximoY,
                        ticks: { color: 'rgba(255, 255, 255, 0.5)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255, 255, 255, 0.5)' },
                        grid: { display: false },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#1a1a1a',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'var(--primary-color)',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            title: (ctx) => {
                                if (tipoTooltip === 'Diário') {
                                    return `${ctx[0].label}/${(mesAtual + 1).toString().padStart(2, '0')}`;
                                }
                                return ctx[0].label;
                            },
                            label: (ctx) => `Lucro ${tipoTooltip}: ${ctx.raw.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                        }
                    }
                }
            }
        };
    }
    
    async function salvarAposta(apostaData) {
        const { error } = await supabaseClient.from('apostas').insert([apostaData]);
        if (error) {
            console.error('Erro ao salvar aposta:', error);
            alert('Não foi possível salvar a aposta.');
        } else {
            fecharModal();
            carregarApostas();
        }
    }
    async function atualizarAposta(apostaData) {
        const { error } = await supabaseClient.from('apostas').update(apostaData).eq('id', idApostaEmEdicao);
        if (error) {
            console.error('Erro ao atualizar aposta:', error);
            alert('Não foi possível atualizar a aposta.');
        } else {
            fecharModal();
            carregarApostas();
        }
    }
    async function excluirAposta(id) {
        if (confirm('Tem certeza que deseja excluir esta aposta?')) {
            const { error } = await supabaseClient.from('apostas').delete().eq('id', id);
            if (error) {
                console.error('Erro ao excluir aposta:', error);
                alert('Não foi possível excluir a aposta.');
            } else {
                carregarApostas();
            }
        }
    }
    async function iniciarEdicao(id) {
        const { data: aposta, error } = await supabaseClient.from('apostas').select('*').eq('id', id).single();
        if (error) {
            console.error('Erro ao buscar aposta para edição:', error);
            alert('Não foi possível carregar os dados da aposta.');
            return;
        }
        idApostaEmEdicao = id;
        document.querySelector('#modalNovaAposta h2').textContent = 'Editar Aposta';
        preencherFormulario(aposta);
        abrirModal();
    }
    function preencherFormulario(aposta) {
        document.getElementById('data').value = aposta.data;
        document.getElementById('nomeConta').value = aposta.nome_conta;
        document.getElementById('obs1').value = aposta.observacao1;
        document.getElementById('obs2').value = aposta.observacao2;
        document.getElementById('tipoAposta').value = aposta.tipo_aposta;
        document.getElementById('casaApostas').value = aposta.casa_apostas;
        document.getElementById('lucroTotalPrevisto').value = aposta.valor_lucro_total_previsto;
        document.getElementById('resultadoLucroTotal').value = aposta.resultado_lucro_total;
        document.querySelectorAll('input[name="status"]').forEach(radio => {
            radio.checked = radio.value === aposta.status;
        });
    }

    function preencherFiltroCasas(apostas) {
        const casas = [...new Set(apostas.map(aposta => aposta.casa_apostas).filter(Boolean))];
        const casaSelecionada = filtroCasaSelect.value;
        filtroCasaSelect.innerHTML = '<option value="todas">Todas as Casas</option>';
        casas.sort().forEach(casa => {
            const option = document.createElement('option');
            option.value = casa;
            option.textContent = casa;
            filtroCasaSelect.appendChild(option);
        });
        filtroCasaSelect.value = casaSelecionada;
    }

    const abrirModal = () => modal.classList.add('active');
    const fecharModal = () => {
        modal.classList.remove('active');
        formNovaAposta.reset();
        idApostaEmEdicao = null;
        document.querySelector('#modalNovaAposta h2').textContent = 'Nova Aposta';
    }

    // --- 3. EVENT LISTENERS ---
    const abrirModalNovaAposta = (e) => {
        if (e) e.preventDefault();
        idApostaEmEdicao = null;
        formNovaAposta.reset();
        document.querySelector('#modalNovaAposta h2').textContent = 'Nova Aposta';

        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        document.getElementById('data').value = `${ano}-${mes}-${dia}`;
        
        abrirModal();
    };

    novaApostaBtn.addEventListener('click', abrirModalNovaAposta);
    novaApostaHeaderBtn.addEventListener('click', abrirModalNovaAposta);

    fecharModalBtn.addEventListener('click', fecharModal);
    cancelarBtn.addEventListener('click', fecharModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });

    betsListContainer.addEventListener('click', function(event) {
        const target = event.target.closest('.action-btn');
        if (!target) return;
        const apostaId = target.dataset.id;
        if (target.classList.contains('btn-delete')) {
            excluirAposta(apostaId);
        } else if (target.classList.contains('btn-edit')) {
            iniciarEdicao(apostaId);
        }
    });
    
    filtroNomeInput.addEventListener('keyup', () => {
        filtrosAtuais.nome = filtroNomeInput.value;
        carregarApostas();
    });
    filtroCasaSelect.addEventListener('change', () => {
        filtrosAtuais.casa = filtroCasaSelect.value;
        carregarApostas();
    });
    filtroTipoSelect.addEventListener('change', () => { // Adicionado
        filtrosAtuais.tipo = filtroTipoSelect.value;
        carregarApostas();
    });
    filtroStatusSelect.addEventListener('change', () => {
        filtrosAtuais.status = filtroStatusSelect.value;
        carregarApostas();
    });
    limparFiltrosBtn.addEventListener('click', () => {
        filtrosAtuais = { nome: '', casa: 'todas', tipo: 'todos', status: 'todos' }; // Adicionado
        filtroNomeInput.value = '';
        filtroCasaSelect.value = 'todas';
        filtroTipoSelect.value = 'todos'; // Adicionado
        filtroStatusSelect.value = 'todos';
        carregarApostas();
    });

    chartDailyBtn.addEventListener('click', () => {
        chartView = 'daily';
        chartDailyBtn.classList.add('active');
        chartMonthlyBtn.classList.remove('active');
        carregarApostas();
    });

    chartMonthlyBtn.addEventListener('click', () => {
        chartView = 'monthly';
        chartMonthlyBtn.classList.add('active');
        chartDailyBtn.classList.remove('active');
        carregarApostas();
    });
    
    notasTextarea.addEventListener('keyup', () => {
        localStorage.setItem('ls-betting-notas', notasTextarea.value);
    });

    formNovaAposta.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = formNovaAposta.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        const apostaData = {
            data: document.getElementById('data').value,
            nome_conta: document.getElementById('nomeConta').value,
            observacao1: document.getElementById('obs1').value,
            observacao2: document.getElementById('obs2').value,
            tipo_aposta: document.getElementById('tipoAposta').value,
            casa_apostas: document.getElementById('casaApostas').value,
            valor_lucro_total_previsto: parseFloat(document.getElementById('lucroTotalPrevisto').value) || 0,
            status: document.querySelector('input[name="status"]:checked').value,
            resultado_lucro_total: parseFloat(document.getElementById('resultadoLucroTotal').value) || null
        };

        if (idApostaEmEdicao) {
            submitButton.textContent = 'Atualizando...';
            await atualizarAposta(apostaData);
        } else {
            submitButton.textContent = 'Salvando...';
            await salvarAposta(apostaData);
        }

        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Aposta';
    });

    // --- 4. INICIALIZAÇÃO ---
    const notasSalvas = localStorage.getItem('ls-betting-notas');
    if (notasSalvas) {
        notasTextarea.value = notasSalvas;
    }
    carregarApostas();
});


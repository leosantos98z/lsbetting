// ======================= VARIÁVEIS GLOBAIS =======================
let idApostaEmEdicao = null;
let meuGrafico = null;
let chartView = 'daily';
let filtrosAtuais = {
    nome: '',
    casa: 'todas',
    tipo: 'todos',
    status: 'todos'
};
let authMode = 'login';
let isLucroTotalVisible = true;
let lucroTotalCache = 0;

// Ícones SVG para o botão de visibilidade
const eyeOpenIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeClosedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;


// ======================= CONFIGURAÇÃO DO SUPABASE =======================
const SUPABASE_URL = 'https://veswuzzftcqvpxfqithr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlc3d1enpmdGNxdnB4ZnFpdGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTk2MjAsImV4cCI6MjA3Mjg3NTYyMH0.W630ZPEZ25TmIZOL0OjbBIBRUgaT6REiSSILzuBVK4g';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ======================= LÓGICA PRINCIPAL DA APLICAÇÃO =======================
document.addEventListener('DOMContentLoaded', () => {

    // --- SELETORES GERAIS ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authButton = document.getElementById('auth-button');
    const authMessage = document.getElementById('auth-message');
    const authToggleButton = document.getElementById('auth-toggle-button');
    const authError = document.getElementById('auth-error');
    const logoutButton = document.getElementById('logout-button');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const subscriptionStatusDisplay = document.getElementById('subscription-status');
    const appContent = document.getElementById('app-content');
    const modalAssinaturaExpirada = document.getElementById('modalAssinaturaExpirada');


    // --- LÓGICA DE AUTENTICAÇÃO ---

    async function checkUserSession() {
        const {
            data: {
                session
            }
        } = await supabaseClient.auth.getSession();
        if (session) {
            const {
                data: profile,
                error
            } = await supabaseClient
                .from('profiles')
                .select('subscription_expires_at, role')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error("Erro ao buscar perfil:", error);
                await supabaseClient.auth.signOut();
                showAuthScreen();
                return;
            }

            const expirationDate = new Date(profile.subscription_expires_at);
            const hoje = new Date();
            const diasRestantes = Math.ceil((expirationDate - hoje) / (1000 * 60 * 60 * 24));

            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailDisplay.textContent = session.user.email;

            if (diasRestantes > 0) {
                subscriptionStatusDisplay.textContent = `${diasRestantes} dias restantes`;
                subscriptionStatusDisplay.className = 'subscription-status active';
                appContent.style.display = 'block';
                initializeApp(profile.role === 'admin');
            } else {
                subscriptionStatusDisplay.textContent = 'Plano Expirado';
                subscriptionStatusDisplay.className = 'subscription-status expired';
                appContent.style.display = 'none'; // Esconde a aplicação principal

                // Mostra o modal de assinatura expirada
                if (modalAssinaturaExpirada) {
                    modalAssinaturaExpirada.classList.add('active');
                }
            }

        } else {
            showAuthScreen();
        }
    }

    // Adiciona listener ao botão de logout do modal de expiração
    const logoutExpiradoBtn = document.getElementById('logoutExpiradoBtn');
    if (logoutExpiradoBtn) {
        logoutExpiradoBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            if (modalAssinaturaExpirada) {
                modalAssinaturaExpirada.classList.remove('active');
            }
            checkUserSession();
        });
    }

    function showAuthScreen() {
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    function updateAuthUI() {
        authTitle.textContent = authMode === 'login' ? 'Login' : 'Criar Conta';
        authButton.textContent = authMode === 'login' ? 'Entrar' : 'Cadastrar';
        authMessage.textContent = authMode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?';
        authToggleButton.textContent = authMode === 'login' ? 'Crie uma agora' : 'Faça login';
        authError.textContent = '';
    }

    authToggleButton.addEventListener('click', () => {
        authMode = authMode === 'login' ? 'signup' : 'login';
        updateAuthUI();
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        let response;
        if (authMode === 'login') {
            response = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
        } else {
            response = await supabaseClient.auth.signUp({
                email,
                password
            });
            if (!response.error) {
                alert('Cadastro realizado! Por favor, verifique seu email para confirmar a conta.');
                authMode = 'login';
                updateAuthUI();
            }
        }

        if (response.error) {
            authError.textContent = response.error.message;
        } else {
            checkUserSession();
        }
    });

    logoutButton.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        checkUserSession();
    });

    // Função auxiliar para formatar moeda
    const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    // --- FUNÇÃO DE INICIALIZAÇÃO DA APLICAÇÃO PRINCIPAL ---
    function initializeApp(isAdmin) {

        // --- SELETORES DA APLICAÇÃO ---
        const novaApostaBtn = document.getElementById('novaApostaBtn');
        const novaApostaHeaderBtn = document.getElementById('novaApostaHeaderBtn');
        const modal = document.getElementById('modalNovaAposta');
        const fecharModalBtn = document.getElementById('fecharModalBtn');
        const cancelarBtn = document.getElementById('cancelarBtn');
        const formNovaAposta = document.getElementById('formNovaAposta');
        const betsListContainer = document.querySelector('.bets-list');
        const filtroNomeInput = document.getElementById('filtroNome');
        const filtroCasaSelect = document.getElementById('filtroCasa');
        const filtroTipoSelect = document.getElementById('filtroTipo');
        const filtroStatusSelect = document.getElementById('filtroStatus');
        const limparFiltrosBtn = document.getElementById('limparFiltrosBtn');
        const chartDailyBtn = document.getElementById('chartDailyBtn');
        const chartMonthlyBtn = document.getElementById('chartMonthlyBtn');
        const chartTitle = document.getElementById('chartTitle');
        const notasTextarea = document.getElementById('notasTextarea');
        const toggleLucroTotalBtn = document.getElementById('toggleLucroTotal');
        const lucroTotalValueEl = document.getElementById('lucroTotalValue');
        let isSubmitting = false;

        // --- LÓGICA DE VISIBILIDADE DO LUCRO TOTAL ---
        function updateLucroTotalVisibility() {
            if (isLucroTotalVisible) {
                lucroTotalValueEl.textContent = formatarMoeda(lucroTotalCache);
                toggleLucroTotalBtn.innerHTML = eyeOpenIcon;
            } else {
                lucroTotalValueEl.textContent = 'R$ ••••••';
                toggleLucroTotalBtn.innerHTML = eyeClosedIcon;
            }
        }

        const savedVisibility = localStorage.getItem('lucroTotalVisible');
        if (savedVisibility !== null) {
            isLucroTotalVisible = savedVisibility === 'true';
        }

        toggleLucroTotalBtn.addEventListener('click', () => {
            isLucroTotalVisible = !isLucroTotalVisible;
            localStorage.setItem('lucroTotalVisible', isLucroTotalVisible);
            updateLucroTotalVisibility();
        });


        // --- NAVEGAÇÃO ---
        const inicioBtn = document.getElementById('inicioBtn');
        const calculadoraBtn = document.getElementById('calculadoraBtn');
        const dashboardContent = document.getElementById('dashboard-content');
        const calculatorPanel = document.getElementById('calculator-panel');

        function navigateTo(page) {
            dashboardContent.style.display = 'none';
            calculatorPanel.style.display = 'none';
            inicioBtn.classList.remove('active');
            calculadoraBtn.classList.remove('active');

            if (page === 'dashboard') {
                dashboardContent.style.display = 'block';
                inicioBtn.classList.add('active');
            } else if (page === 'calculator') {
                calculatorPanel.style.display = 'block';
                calculadoraBtn.classList.add('active');
            }
        }

        navigateTo('dashboard');

        inicioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('dashboard');
        });

        calculadoraBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('calculator');
        });

        // PAINEL DE ADMIN
        const adminPanel = document.getElementById('admin-panel');
        const userSelect = document.getElementById('user-select');
        const daysToAddInput = document.getElementById('days-to-add');
        const addDaysBtn = document.getElementById('add-days-btn');
        const adminMessage = document.getElementById('admin-message');

        if (isAdmin) {
            adminPanel.style.display = 'block';
            loadAdminPanel();
        }

        async function loadAdminPanel() {
            const {
                data: profiles,
                error
            } = await supabaseClient.from('profiles').select('id, email');
            if (error) {
                console.error("Erro ao carregar perfis para admin:", error);
                return;
            }
            userSelect.innerHTML = '';
            profiles.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.id;
                option.textContent = profile.email;
                userSelect.appendChild(option);
            });
        }

        addDaysBtn.addEventListener('click', async () => {
            const userId = userSelect.value;
            const days = parseInt(daysToAddInput.value, 10);
            if (!userId || !days) {
                adminMessage.textContent = "Por favor, selecione um utilizador e insira o número de dias.";
                return;
            }

            const {
                data: profile,
                error: fetchError
            } = await supabaseClient
                .from('profiles')
                .select('subscription_expires_at')
                .eq('id', userId)
                .single();

            if (fetchError) {
                adminMessage.textContent = `Erro ao buscar perfil: ${fetchError.message}`;
                return;
            }

            const currentExpiration = new Date(profile.subscription_expires_at);
            const newExpiration = new Date(currentExpiration.setDate(currentExpiration.getDate() + days));

            const {
                error: updateError
            } = await supabaseClient
                .from('profiles')
                .update({
                    subscription_expires_at: newExpiration.toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                adminMessage.textContent = `Erro ao atualizar subscrição: ${updateError.message}`;
            } else {
                adminMessage.textContent = `Subscrição de ${userSelect.options[userSelect.selectedIndex].text} atualizada com sucesso!`;
                daysToAddInput.value = '';
            }
        });


        // --- FUNÇÕES DA APLICAÇÃO ---
        async function carregarApostas() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                renderizarLista([]);
                atualizarPainelResumo([]);
                renderizarGrafico([]);
                return;
            }

            const { data: todasAsApostas, error } = await supabaseClient
                .from('apostas')
                .select('*')
                .eq('user_id', user.id)
                .order('id', { ascending: false });

            if (error) {
                console.error('Erro ao buscar apostas:', error);
                return;
            }

            const apostas = todasAsApostas || [];

            // Atualiza resumo e gráfico com a lista COMPLETA
            atualizarPainelResumo(apostas);
            renderizarGrafico(apostas);
            preencherFiltroCasas(apostas);

            // Aplica filtros para a lista
            const apostasFiltradas = apostas.filter(aposta => {
                const nomeMatch = !filtrosAtuais.nome || (aposta.nome_conta && aposta.nome_conta.toLowerCase().includes(filtrosAtuais.nome.toLowerCase()));
                const casaMatch = filtrosAtuais.casa === 'todas' || aposta.casa_apostas === filtrosAtuais.casa;
                const tipoMatch = filtrosAtuais.tipo === 'todos' || aposta.tipo_aposta === filtrosAtuais.tipo;
                const statusMatch = filtrosAtuais.status === 'todos' || aposta.status === filtrosAtuais.status;
                return nomeMatch && casaMatch && tipoMatch && statusMatch;
            });

            // Renderiza a lista com dados FILTRADOS
            renderizarLista(apostasFiltradas);
            
            // Atualiza o card de Total Filtrado com base nos dados FILTRADOS
            atualizarTotalFiltrado(apostasFiltradas);
        }

        function renderizarLista(apostas) {
            betsListContainer.querySelectorAll('.grid-row').forEach(row => row.remove());
            const emptyState = betsListContainer.querySelector('.empty-state');
            if (emptyState) emptyState.remove();
            
            const totalApostas = apostas.length;

            if (totalApostas === 0) {
                betsListContainer.insertAdjacentHTML('beforeend', `<div class="empty-state"><p>Nenhuma aposta encontrada.</p></div>`);
            } else {
                apostas.forEach((aposta, index) => {
                    const apostaElement = document.createElement('div');
                    apostaElement.classList.add('grid-row');
                    const dataFormatada = aposta.data ? new Date(aposta.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
                    const resultado = aposta.resultado_lucro_total || 0;
                    const resultadoClasse = resultado > 0 ? 'resultado-positivo' : resultado < 0 ? 'resultado-negativo' : '';
                    const statusClass = (aposta.status || '').toLowerCase().replace(/ /g, '-').replace('ú', 'u');
                    const userFacingId = totalApostas - index;


                    apostaElement.innerHTML = `
                        <div class="grid-cell" data-label="ID">${userFacingId}</div>
                        <div class="grid-cell" data-label="Data">${dataFormatada}</div>
                        <div class="grid-cell" data-label="Nome">${aposta.nome_conta || '-'}</div>
                        <div class="grid-cell" data-label="Casa">${aposta.casa_apostas || '-'}</div>
                        <div class="grid-cell" data-label="Obs">${aposta.observacao1 || '-'}</div>
                        <div class="grid-cell ${resultadoClasse}" data-label="Resultado">${resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                        <div class="grid-cell" data-label="Tipo">${aposta.tipo_aposta || '-'}</div>
                        <div class="grid-cell" data-label="Status"><span class="status-badge status-${statusClass}">${aposta.status}</span></div>
                        <div class="grid-cell action-buttons" data-label="Ações">
                            <button class="action-btn btn-edit" title="Editar Aposta" data-id="${aposta.id}">✏️</button>
                            <button class="action-btn btn-delete" title="Excluir Aposta" data-id="${aposta.id}">🗑️</button>
                        </div>
                    `;
                    betsListContainer.appendChild(apostaElement);
                });
            }
        }

        function atualizarTotalFiltrado(apostasFiltradas) {
            const totalFiltrado = apostasFiltradas
                .filter(aposta => aposta.status === 'Concluído')
                .reduce((total, aposta) => total + (aposta.resultado_lucro_total || 0), 0);

            const totalCard = document.getElementById('total-results-card');
            const totalValueEl = document.getElementById('totalFiltradoValue');

            if (totalCard && totalValueEl) {
                totalValueEl.textContent = formatarMoeda(totalFiltrado);
                totalValueEl.classList.remove('resultado-positivo', 'resultado-negativo');
                if (totalFiltrado > 0) {
                    totalValueEl.classList.add('resultado-positivo');
                } else if (totalFiltrado < 0) {
                    totalValueEl.classList.add('resultado-negativo');
                }
            }
        }

        function atualizarPainelResumo(apostas) {
            const lucroMesEl = document.getElementById('lucroMesValue');
            const lucroMedioMensalEl = document.getElementById('lucroMedioMensalValue');
            const apostasAndamentoEl = document.getElementById('apostasAndamentoValue');
            const apostasConcluidasEl = document.getElementById('apostasConcluidasValue');

            const todasAsConcluidas = apostas.filter(aposta => aposta.status === 'Concluído');
            const emAndamento = apostas.filter(aposta => aposta.status === 'Em andamento');
            const lucroTotal = todasAsConcluidas.reduce((total, aposta) => total + (aposta.resultado_lucro_total || 0), 0);
            
            lucroTotalCache = lucroTotal;
            updateLucroTotalVisibility();

            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();

            const concluidasMesAtual = todasAsConcluidas.filter(aposta => {
                if (!aposta.data) return false;
                const [year, month] = aposta.data.split('-').map(Number);
                return year === anoAtual && month === mesAtual + 1;
            });

            const lucroMes = concluidasMesAtual.reduce((total, aposta) => total + (aposta.resultado_lucro_total || 0), 0);
            
            // LÓGICA CORRIGIDA: Média de lucro por dia com aposta, não por aposta individual.
            const diasComApostasNoMes = new Set(concluidasMesAtual.map(aposta => aposta.data));
            const lucroMedioMes = diasComApostasNoMes.size > 0 ? lucroMes / diasComApostasNoMes.size : 0;

            lucroMesEl.textContent = formatarMoeda(lucroMes);
            lucroMedioMensalEl.textContent = formatarMoeda(lucroMedioMes);
            apostasConcluidasEl.textContent = concluidasMesAtual.length;
            apostasAndamentoEl.textContent = emAndamento.length;
        }


        function renderizarGrafico(apostas) {
            const ctx = document.getElementById('graficoLucroDiario').getContext('2d');
            if (meuGrafico) meuGrafico.destroy();
            let chartConfig;
            if (chartView === 'daily') {
                chartTitle.textContent = 'Lucro Diário';
                const hoje = new Date();
                const mesAtual = hoje.getMonth();
                const anoAtual = hoje.getFullYear();
                const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
                const lucrosPorDia = Array(diasNoMes).fill(0);
                const apostasDoMes = apostas.filter(a => a.data && a.status === 'Concluído' && new Date(a.data + 'T00:00:00').getMonth() === mesAtual && new Date(a.data + 'T00:00:00').getFullYear() === anoAtual);
                let maiorLucroDiario = 0;
                apostasDoMes.forEach(aposta => {
                    const dia = new Date(aposta.data + 'T00:00:00').getDate();
                    lucrosPorDia[dia - 1] += aposta.resultado_lucro_total || 0;
                    if (lucrosPorDia[dia - 1] > maiorLucroDiario) maiorLucroDiario = lucrosPorDia[dia - 1];
                });
                const topoGrafico = Math.ceil(maiorLucroDiario / 100) * 100;
                const labels = Array.from({
                    length: diasNoMes
                }, (_, i) => (i + 1).toString().padStart(2, '0'));
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
                const labels = mesesOrdenados.map(key => new Date(key.split('-')[0], key.split('-')[1]).toLocaleString('pt-BR', {
                    month: 'short',
                    year: '2-digit'
                }));
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
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: maximoY,
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.5)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.5)'
                            },
                            grid: {
                                display: false
                            },
                            border: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: '#1a1a1a',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: 'var(--primary-color)',
                            borderWidth: 1,
                            displayColors: false,
                            callbacks: {
                                title: (ctx) => tipoTooltip === 'Diário' ? `${ctx[0].label}/${(mesAtual + 1).toString().padStart(2, '0')}` : ctx[0].label,
                                label: (ctx) => `Lucro ${tipoTooltip}: ${ctx.raw.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                            }
                        }
                    }
                }
            };
        }

        async function salvarAposta(apostaData) {
            const {
                data: {
                    user
                }
            } = await supabaseClient.auth.getUser();
            if (!user) {
                alert('Sessão expirada. Por favor, faça login novamente.');
                return;
            }
            apostaData.user_id = user.id;

            const {
                error
            } = await supabaseClient.from('apostas').insert([apostaData]);
            if (error) {
                console.error('Erro ao salvar aposta:', error);
                alert('Não foi possível salvar a aposta.');
            } else {
                fecharModal();
                carregarApostas();
            }
        }

        async function atualizarAposta(apostaData) {
            const {
                error
            } = await supabaseClient.from('apostas').update(apostaData).eq('id', idApostaEmEdicao);
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
                const {
                    error
                } = await supabaseClient.from('apostas').delete().eq('id', id);
                if (error) {
                    console.error('Erro ao excluir aposta:', error);
                    alert('Não foi possível excluir a aposta.');
                } else {
                    carregarApostas();
                }
            }
        }

        async function iniciarEdicao(id) {
            const {
                data: aposta,
                error
            } = await supabaseClient.from('apostas').select('*').eq('id', id).single();
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

        async function salvarNotas() {
            const {
                data: {
                    user
                }
            } = await supabaseClient.auth.getUser();
            if (user) {
                localStorage.setItem(`notas-${user.id}`, notasTextarea.value);
            }
        }

        async function carregarNotas() {
            const {
                data: {
                    user
                }
            } = await supabaseClient.auth.getUser();
            if (user) {
                const notasSalvas = localStorage.getItem(`notas-${user.id}`);
                if (notasSalvas) {
                    notasTextarea.value = notasSalvas;
                }
            }
        }

        const abrirModal = () => {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
        const fecharModal = () => {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            formNovaAposta.reset();
            idApostaEmEdicao = null;
            document.querySelector('#modalNovaAposta h2').textContent = 'Nova Aposta';
        }

        // --- LISTENERS DA APLICAÇÃO ---
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
        modal.addEventListener('click', (e) => {
            if (e.target === modal) fecharModal();
        });
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
        filtroTipoSelect.addEventListener('change', () => {
            filtrosAtuais.tipo = filtroTipoSelect.value;
            carregarApostas();
        });
        filtroStatusSelect.addEventListener('change', () => {
            filtrosAtuais.status = filtroStatusSelect.value;
            carregarApostas();
        });
        limparFiltrosBtn.addEventListener('click', () => {
            filtrosAtuais = {
                nome: '',
                casa: 'todas',
                tipo: 'todos',
                status: 'todos'
            };
            filtroNomeInput.value = '';
            filtroCasaSelect.value = 'todos';
            filtroTipoSelect.value = 'todos';
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
        notasTextarea.addEventListener('keyup', salvarNotas);

        formNovaAposta.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (isSubmitting) {
                console.log('A submissão já está em andamento.');
                return;
            }
            isSubmitting = true;

            const submitButton = formNovaAposta.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            const apostaData = {
                data: document.getElementById('data').value,
                nome_conta: document.getElementById('nomeConta').value,
                observacao1: document.getElementById('obs1').value,
                observacao2: '', // Adicionado para evitar erro de not-null
                tipo_aposta: document.getElementById('tipoAposta').value,
                casa_apostas: document.getElementById('casaApostas').value,
                valor_lucro_total_previsto: parseFloat(document.getElementById('lucroTotalPrevisto').value) || 0,
                status: document.querySelector('input[name="status"]:checked').value,
                resultado_lucro_total: parseFloat(document.getElementById('resultadoLucroTotal').value) || null
            };

            try {
                if (idApostaEmEdicao) {
                    submitButton.textContent = 'Atualizando...';
                    await atualizarAposta(apostaData);
                } else {
                    submitButton.textContent = 'Salvando...';
                    await salvarAposta(apostaData);
                }
            } catch (error) {
                 console.error("Ocorreu um erro ao salvar a aposta:", error);
            } finally {
                isSubmitting = false;
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Aposta';
            }
        });

        // --- LÓGICA DA CALCULADORA DE DUTCHING ---
        function setupDutchingCalculator() {
            const calculationTypeSelect = document.getElementById('calculationType');
            const mainInvestmentInput = document.getElementById('mainInvestment');
            const mainInvestmentLabel = document.getElementById('mainInvestmentLabel');
            const calculatorRowsContainer = document.getElementById('calculator-rows');
            const addRowBtn = document.getElementById('addRowBtn');
            const resetCalcBtn = document.getElementById('resetCalcBtn');
            const summaryProfitEl = document.getElementById('summaryProfit');
            const summaryReturnEl = document.getElementById('summaryReturn');
            const summaryTotalStakeEl = document.getElementById('summaryTotalStake');
            const totalStakeContainer = document.getElementById('totalStakeContainer');
            
            const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            function updateCalculationUI() {
                const type = calculationTypeSelect.value;
                if (type === 'totalInvestment') {
                    mainInvestmentLabel.textContent = 'Investimento Total:';
                    totalStakeContainer.style.display = 'none';
                } else {
                    mainInvestmentLabel.textContent = 'Montante da 1ª Seleção:';
                    totalStakeContainer.style.display = 'flex';
                }
                calculateDutching();
            }

            function calculateDutching() {
                const type = calculationTypeSelect.value;
                const mainValue = parseFloat(mainInvestmentInput.value) || 0;
                const allRows = Array.from(calculatorRowsContainer.querySelectorAll('tr'));

                const oddsWithRows = allRows.map(row => ({
                    odd: parseFloat(row.querySelector('.odd-input').value) || 0,
                    row: row
                }));

                const validEntries = oddsWithRows.filter(entry => entry.odd > 0);

                if (mainValue <= 0 || validEntries.length === 0) {
                    allRows.forEach(row => {
                        row.querySelector('.stake-output').textContent = formatCurrency(0);
                        row.querySelector('.return-output').textContent = formatCurrency(0);
                    });
                    summaryProfitEl.textContent = formatCurrency(0);
                    summaryReturnEl.textContent = formatCurrency(0);
                    summaryTotalStakeEl.textContent = formatCurrency(0);
                    summaryProfitEl.className = 'summary-item';
                    return;
                }

                let stakes = [];
                let totalInvestment = 0;
                let avgReturn = 0;

                if (type === 'totalInvestment') {
                    totalInvestment = mainValue;
                    const validOdds = validEntries.map(entry => entry.odd);
                    const impliedProbabilities = validOdds.map(odd => (1 / odd));
                    const totalImpliedProbability = impliedProbabilities.reduce((sum, prob) => sum + prob, 0);

                    if (totalImpliedProbability > 0) {
                        stakes = impliedProbabilities.map(prob => (totalInvestment * prob) / totalImpliedProbability);
                        const returns = stakes.map((stake, index) => stake * validOdds[index]);
                        avgReturn = returns.length > 0 ? returns[0] : 0;
                    }
                } else { // firstStake
                    const firstStake = mainValue;
                    const firstOdd = validEntries.length > 0 ? validEntries[0].odd : 0;
                    if (firstOdd > 0) {
                        const targetReturn = firstStake * firstOdd;
                        avgReturn = targetReturn;
                        stakes = validEntries.map(entry => targetReturn / entry.odd);
                        totalInvestment = stakes.reduce((sum, stake) => sum + stake, 0);
                    }
                }

                const profit = avgReturn - totalInvestment;

                summaryProfitEl.textContent = formatCurrency(profit);
                summaryReturnEl.textContent = formatCurrency(avgReturn);
                summaryTotalStakeEl.textContent = formatCurrency(totalInvestment);
                summaryProfitEl.classList.remove('profit', 'loss');
                if (profit > 0) summaryProfitEl.classList.add('profit');
                if (profit < 0) summaryProfitEl.classList.add('loss');

                oddsWithRows.forEach(entry => {
                    const validIndex = validEntries.findIndex(valid => valid.row === entry.row);
                    if (validIndex !== -1 && stakes[validIndex]) {
                        entry.row.querySelector('.stake-output').textContent = formatCurrency(stakes[validIndex]);
                        entry.row.querySelector('.return-output').textContent = formatCurrency(avgReturn);
                    } else {
                        entry.row.querySelector('.stake-output').textContent = formatCurrency(0);
                        entry.row.querySelector('.return-output').textContent = formatCurrency(0);
                    }
                });
            }

            function createRow(index) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index}º</td>
                    <td><input type="number" step="0.01" class="odd-input" placeholder="Ex: 2.20"></td>
                    <td class="stake-output">${formatCurrency(0)}</td>
                    <td class="return-output">${formatCurrency(0)}</td>
                    <td><button class="link-button remove-row-btn">Remover</button></td>
                `;
                row.querySelector('.odd-input').addEventListener('input', calculateDutching);
                row.querySelector('.remove-row-btn').addEventListener('click', () => {
                    if (calculatorRowsContainer.children.length > 1) {
                        row.remove();
                        updateRowNumbers();
                        calculateDutching();
                    }
                });
                return row;
            }
            
            function updateRowNumbers() {
                const rows = calculatorRowsContainer.querySelectorAll('tr');
                rows.forEach((row, index) => {
                    row.querySelector('td:first-child').textContent = `${index + 1}º`;
                });
            }

            function addRow() {
                const rowCount = calculatorRowsContainer.children.length;
                calculatorRowsContainer.appendChild(createRow(rowCount + 1));
            }
            
            function resetCalculator() {
                mainInvestmentInput.value = '';
                calculatorRowsContainer.innerHTML = '';
                addRow();
                addRow();
                calculateDutching();
            }
            
            calculationTypeSelect.addEventListener('change', updateCalculationUI);
            mainInvestmentInput.addEventListener('input', calculateDutching);
            addRowBtn.addEventListener('click', addRow);
            resetCalcBtn.addEventListener('click', resetCalculator);
            
            resetCalculator();
        }


        // --- INICIALIZAÇÃO DAS PARTES DA APLICAÇÃO ---
        carregarApostas();
        carregarNotas();
        setupDutchingCalculator();
    }

    // --- INICIALIZAÇÃO GERAL ---
    checkUserSession();
});



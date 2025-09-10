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

        // --- NAVEGAÇÃO ---
        const inicioBtn = document.getElementById('inicioBtn');
        const calculadoraBtn = document.getElementById('calculadoraBtn');
        const dashboardContent = document.getElementById('dashboard-content');
        const calculatorPanel = document.getElementById('calculator-panel');

        function navigateTo(page) {
            // Esconde todos os painéis
            dashboardContent.style.display = 'none';
            calculatorPanel.style.display = 'none';

            // Remove a classe 'active' de todos os links de navegação
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
            let query = supabaseClient.from('apostas').select('*');
            if (filtrosAtuais.nome) {
                query = query.ilike('nome_conta', `%${filtrosAtuais.nome}%`);
            }
            if (filtrosAtuais.casa && filtrosAtuais.casa !== 'todas') {
                query = query.eq('casa_apostas', filtrosAtuais.casa);
            }
            if (filtrosAtuais.tipo && filtrosAtuais.tipo !== 'todos') {
                query = query.eq('tipo_aposta', filtrosAtuais.tipo);
            }
            if (filtrosAtuais.status && filtrosAtuais.status !== 'todos') {
                query = query.eq('status', filtrosAtuais.status);
            }
            query = query.order('id', {
                ascending: false
            });

            const {
                data: apostas,
                error
            } = await query;
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
                betsListContainer.insertAdjacentHTML('beforeend', `<div class="empty-state"><p>Nenhuma aposta encontrada.</p></div>`);
            } else {
                apostas.forEach(aposta => {
                    const apostaElement = document.createElement('div');
                    apostaElement.classList.add('grid-row');
                    const dataFormatada = aposta.data ? new Date(aposta.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
                    const resultado = aposta.resultado_lucro_total || 0;
                    const resultadoClasse = resultado > 0 ? 'resultado-positivo' : resultado < 0 ? 'resultado-negativo' : '';
                    const statusClass = (aposta.status || '').toLowerCase().replace(/ /g, '-').replace('ú', 'u');

                    apostaElement.innerHTML = `
                        <div class="grid-cell" data-label="ID">${aposta.id}</div>
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

        function atualizarPainelResumo(apostas) {
            const lucroTotalEl = document.getElementById('lucroTotalValue');
            const lucroMedioEl = document.getElementById('lucroMedioValue');
            const apostasAndamentoEl = document.getElementById('apostasAndamentoValue');
            const apostasConcluidasEl = document.getElementById('apostasConcluidasValue');
            const concluidas = apostas.filter(aposta => aposta.status === 'Concluído');
            const emAndamento = apostas.filter(aposta => aposta.status === 'Em andamento');
            const lucroTotal = concluidas.reduce((total, aposta) => total + (aposta.resultado_lucro_total || 0), 0);
            const lucroMedio = concluidas.length > 0 ? lucroTotal / concluidas.length : 0;
            const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            lucroTotalEl.textContent = formatarMoeda(lucroTotal);
            lucroMedioEl.textContent = formatarMoeda(lucroMedio);
            apostasConcluidasEl.textContent = concluidas.length;
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

        const abrirModal = () => modal.classList.add('active');
        const fecharModal = () => {
            modal.classList.remove('active');
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
            const submitButton = formNovaAposta.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            const apostaData = {
                data: document.getElementById('data').value,
                nome_conta: document.getElementById('nomeConta').value,
                observacao1: document.getElementById('obs1').value,
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

        // --- LÓGICA DA CALCULADORA DE SUREBET ---
        function setupSurebetCalculator() {
            const totalStakeInput = document.getElementById('totalStake');
            const odd1Input = document.getElementById('odd1');
            const odd2Input = document.getElementById('odd2');
            const odd3Input = document.getElementById('odd3');
            const outcome2Btn = document.getElementById('outcome2Btn');
            const outcome3Btn = document.getElementById('outcome3Btn');
            const outcome3Group = document.getElementById('outcome3Group');
            const stake3ResultContainer = document.getElementById('stake3ResultContainer');

            const resultMessage = document.getElementById('result-message');
            const resultDetails = document.getElementById('result-details');
            const stake1Result = document.getElementById('stake1Result');
            const stake2Result = document.getElementById('stake2Result');
            const stake3Result = document.getElementById('stake3Result');
            const profitResult = document.getElementById('profitResult');
            const roiResult = document.getElementById('roiResult');

            let numOutcomes = 2;

            function formatCurrency(value) {
                return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            function calculateSurebet() {
                const totalStake = parseFloat(totalStakeInput.value) || 0;
                const odd1 = parseFloat(odd1Input.value) || 0;
                const odd2 = parseFloat(odd2Input.value) || 0;
                const odd3 = numOutcomes === 3 ? (parseFloat(odd3Input.value) || 0) : 0;

                if (totalStake <= 0 || odd1 <= 1 || odd2 <= 1 || (numOutcomes === 3 && odd3 <= 1)) {
                    resultDetails.style.display = 'none';
                    resultMessage.style.display = 'block';
                    resultMessage.textContent = 'Preencha todos os campos com valores válidos.';
                    resultMessage.className = 'result-message';
                    return;
                }

                const prob1 = 1 / odd1;
                const prob2 = 1 / odd2;
                const prob3 = numOutcomes === 3 ? (1 / odd3) : 0;
                const totalProb = prob1 + prob2 + prob3;

                if (totalProb < 1) { // Surebet exists!
                    const stake1 = (totalStake * prob1) / totalProb;
                    const stake2 = (totalStake * prob2) / totalProb;
                    const profit = (stake1 * odd1) - totalStake;
                    const roi = (profit / totalStake) * 100;

                    stake1Result.textContent = formatCurrency(stake1);
                    stake2Result.textContent = formatCurrency(stake2);
                    profitResult.textContent = formatCurrency(profit);
                    roiResult.textContent = `${roi.toFixed(2)}%`;
                    
                    if (numOutcomes === 3) {
                        const stake3 = (totalStake * prob3) / totalProb;
                        stake3Result.textContent = formatCurrency(stake3);
                        stake3ResultContainer.style.display = 'flex';
                    } else {
                        stake3ResultContainer.style.display = 'none';
                    }

                    resultMessage.textContent = `Surebet encontrado! Lucro de ${roi.toFixed(2)}%`;
                    resultMessage.className = 'result-message profit-positive';
                    resultDetails.style.display = 'block';

                } else { // No surebet
                    const lossPercentage = (totalProb - 1) * 100;
                    resultDetails.style.display = 'none';
                    resultMessage.style.display = 'block';
                    resultMessage.textContent = `Não é uma surebet. Perda de ${lossPercentage.toFixed(2)}%.`;
                    resultMessage.className = 'result-message profit-negative';
                }
            }

            outcome2Btn.addEventListener('click', () => {
                numOutcomes = 2;
                outcome2Btn.classList.add('active');
                outcome3Btn.classList.remove('active');
                outcome3Group.style.display = 'none';
                calculateSurebet();
            });

            outcome3Btn.addEventListener('click', () => {
                numOutcomes = 3;
                outcome3Btn.classList.add('active');
                outcome2Btn.classList.remove('active');
                outcome3Group.style.display = 'block';
                calculateSurebet();
            });

            [totalStakeInput, odd1Input, odd2Input, odd3Input].forEach(input => {
                input.addEventListener('input', calculateSurebet);
            });
        }

        // --- INICIALIZAÇÃO DAS PARTES DA APLICAÇÃO ---
        carregarApostas();
        carregarNotas();
        setupSurebetCalculator();
    }

    // --- INICIALIZAÇÃO GERAL ---
    checkUserSession();
});


document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loanTableBody = document.getElementById('loanTableBody');
    const addLoanBtn = document.getElementById('addLoanBtn');
    const addLoanModal = document.getElementById('addLoanModal');
    const loanDetailsModal = document.getElementById('loanDetailsModal');
    const makePaymentModal = document.getElementById('makePaymentModal');
    const loanForm = document.getElementById('loanForm');
    const paymentForm = document.getElementById('paymentForm');
    const loanSearch = document.getElementById('loanSearch');
    const loanFilter = document.getElementById('loanFilter');
    const themeToggle = document.getElementById('themeToggle');
    const totalLoansEl = document.getElementById('totalLoans');
    const totalBalanceEl = document.getElementById('totalBalance');
    const upcomingPaymentEl = document.getElementById('upcomingPayment');
    
    // State
    let loans = JSON.parse(localStorage.getItem('loans')) || [];
    let currentLoanId = null;
    
    // Initialize the app
    init();
    
    function init() {
        renderLoanTable();
        updateStats();
        setupEventListeners();
        checkThemePreference();
    }
    
    function setupEventListeners() {
        addLoanBtn.addEventListener('click', () => addLoanModal.style.display = 'block');
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                addLoanModal.style.display = 'none';
                loanDetailsModal.style.display = 'none';
                makePaymentModal.style.display = 'none';
            });
        });
        window.addEventListener('click', (e) => {
            if (e.target === addLoanModal) addLoanModal.style.display = 'none';
            if (e.target === loanDetailsModal) loanDetailsModal.style.display = 'none';
            if (e.target === makePaymentModal) makePaymentModal.style.display = 'none';
        });
        loanForm.addEventListener('submit', handleAddLoan);
        paymentForm.addEventListener('submit', handleMakePayment);
        loanSearch.addEventListener('input', renderLoanTable);
        loanFilter.addEventListener('change', renderLoanTable);
        themeToggle.addEventListener('change', toggleTheme);
    }
    
    function checkThemePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        themeToggle.checked = darkMode;
        document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    }
    
    function toggleTheme() {
        const isDark = themeToggle.checked;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('darkMode', isDark);
    }
    
    // Loan functions
    function handleAddLoan(e) {
        e.preventDefault();
        
        const loanName = document.getElementById('loanName').value;
        const loanAmount = parseFloat(document.getElementById('loanAmount').value);
        const interestRate = parseFloat(document.getElementById('interestRate').value);
        const loanTerm = parseInt(document.getElementById('loanTerm').value);
        const startDate = document.getElementById('startDate').value;
        
        const weeklyPayment = calculateWeeklyPayment(loanAmount, interestRate, loanTerm);
        const paymentSchedule = generatePaymentSchedule(loanAmount, interestRate, loanTerm, startDate);
        
        const newLoan = {
            id: Date.now().toString(),
            name: loanName,
            originalAmount: loanAmount,
            remainingBalance: loanAmount,
            interestRate: interestRate,
            monthlyPayment: weeklyPayment, // keep property name for table
            term: loanTerm,
            startDate: startDate,
            status: 'active',
            payments: [],
            paymentSchedule: paymentSchedule
        };
        
        loans.push(newLoan);
        saveLoans();
        renderLoanTable();
        updateStats();
        
        loanForm.reset();
        addLoanModal.style.display = 'none';
    }
    
    // === WEEKLY CALCULATION FUNCTIONS ===
    
    function calculateWeeklyPayment(amount, rate, termWeeks) {
        const weeklyRate = rate / 100 / 52; // annual to weekly
        const payment = amount * weeklyRate * Math.pow(1 + weeklyRate, termWeeks) / (Math.pow(1 + weeklyRate, termWeeks) - 1);
        return parseFloat(payment.toFixed(2));
    }
    
    function generatePaymentSchedule(amount, rate, termWeeks, startDate) {
        const schedule = [];
        const weeklyRate = rate / 100 / 52;
        let balance = amount;
        const start = new Date(startDate);
        const weeklyPayment = calculateWeeklyPayment(amount, rate, termWeeks);
        
        for (let i = 1; i <= termWeeks; i++) {
            const interest = balance * weeklyRate;
            const principal = weeklyPayment - interest;
            balance -= principal;
            
            const paymentDate = new Date(start);
            paymentDate.setDate(start.getDate() + i * 7);
            
            schedule.push({
                paymentNumber: i,
                date: paymentDate.toISOString().split('T')[0],
                payment: parseFloat(weeklyPayment.toFixed(2)),
                principal: parseFloat(principal.toFixed(2)),
                interest: parseFloat(interest.toFixed(2)),
                remainingBalance: Math.max(0, parseFloat(balance.toFixed(2)))
            });
        }
        
        return schedule;
    }
    
    // === END WEEKLY CALCULATION FUNCTIONS ===
    
    function renderLoanTable() {
        const searchTerm = loanSearch.value.toLowerCase();
        const filterValue = loanFilter.value;
        
        const filteredLoans = loans.filter(loan => {
            const matchesSearch = loan.name.toLowerCase().includes(searchTerm);
            const matchesFilter = filterValue === 'all' || 
                                 (filterValue === 'active' && loan.status === 'active') || 
                                 (filterValue === 'paid' && loan.status === 'paid');
            return matchesSearch && matchesFilter;
        });
        
        loanTableBody.innerHTML = '';
        
        if (filteredLoans.length === 0) {
            loanTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-loans">No loans found. Add a new loan to get started.</td>
                </tr>
            `;
            return;
        }
        
        filteredLoans.forEach(loan => {
            const row = document.createElement('tr');
            row.dataset.id = loan.id;
            
            row.innerHTML = `
                <td>${loan.name}</td>
                <td>$${loan.originalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>$${loan.remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${loan.interestRate}%</td>
                <td>$${loan.monthlyPayment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td><span class="status-badge ${loan.status}">${loan.status === 'active' ? 'Active' : 'Paid Off'}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view-loan" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="action-btn delete-loan" title="Delete Loan"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            
            loanTableBody.appendChild(row);
        });
        
        document.querySelectorAll('.view-loan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const loanId = e.target.closest('tr').dataset.id;
                viewLoanDetails(loanId);
            });
        });
        
        document.querySelectorAll('.delete-loan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const loanId = e.target.closest('tr').dataset.id;
                deleteLoan(loanId);
            });
        });
    }
    
    function viewLoanDetails(loanId) {
        currentLoanId = loanId;
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        
        document.getElementById('detailLoanName').textContent = loan.name;
        document.getElementById('detailLoanStatus').className = `loan-status-badge ${loan.status}`;
        document.getElementById('detailLoanStatus').textContent = loan.status === 'active' ? 'Active' : 'Paid Off';
        
        document.getElementById('detailOriginalAmount').textContent = `$${loan.originalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('detailRemainingBalance').textContent = `$${loan.remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('detailInterestRate').textContent = `${loan.interestRate}%`;
        document.getElementById('detailMonthlyPayment').textContent = `$${loan.monthlyPayment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('detailLoanTerm').textContent = `${loan.term} weeks`;
        document.getElementById('detailStartDate').textContent = new Date(loan.startDate).toLocaleDateString();
        
        const paymentScheduleBody = document.getElementById('paymentScheduleBody');
        paymentScheduleBody.innerHTML = '';
        
        loan.paymentSchedule.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.paymentNumber}</td>
                <td>${new Date(payment.date).toLocaleDateString()}</td>
                <td>$${payment.payment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>$${payment.principal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>$${payment.interest.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>$${payment.remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            `;
            paymentScheduleBody.appendChild(row);
        });
        
        document.getElementById('makePaymentBtn').addEventListener('click', () => {
            loanDetailsModal.style.display = 'none';
            makePaymentModal.style.display = 'block';
        });
        
        document.getElementById('deleteLoanBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this loan? This cannot be undone.')) {
                deleteLoan(loanId);
                loanDetailsModal.style.display = 'none';
            }
        });
        
        loanDetailsModal.style.display = 'block';
    }
    
    function handleMakePayment(e) {
        e.preventDefault();
        const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
        const paymentDate = document.getElementById('paymentDate').value;
        const paymentNote = document.getElementById('paymentNote').value;
        const loanIndex = loans.findIndex(l => l.id === currentLoanId);
        if (loanIndex === -1) return;
        const loan = loans[loanIndex];
        
        loan.payments.push({
            amount: paymentAmount,
            date: paymentDate,
            note: paymentNote
        });
        
        loan.remainingBalance = Math.max(0, loan.remainingBalance - paymentAmount);
        if (loan.remainingBalance <= 0) loan.status = 'paid';
        
        saveLoans();
        renderLoanTable();
        updateStats();
        
        paymentForm.reset();
        makePaymentModal.style.display = 'none';
        loanDetailsModal.style.display = 'block';
        viewLoanDetails(currentLoanId);
    }
    
    function deleteLoan(loanId) {
        loans = loans.filter(loan => loan.id !== loanId);
        saveLoans();
        renderLoanTable();
        updateStats();
    }
    
    function updateStats() {
        const totalLoans = loans.length;
        const totalBalance = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
        let upcomingPayment = 0;
        const activeLoans = loans.filter(loan => loan.status === 'active');
        if (activeLoans.length > 0) {
            upcomingPayment = activeLoans[0].monthlyPayment; // now weekly
        }
        
        totalLoansEl.textContent = totalLoans;
        totalBalanceEl.textContent = `₱${totalBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        upcomingPaymentEl.textContent = `₱${upcomingPayment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    
    function saveLoans() {
        localStorage.setItem('loans', JSON.stringify(loans));
    }
});


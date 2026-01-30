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

    let loans = JSON.parse(localStorage.getItem('loans')) || [];
    let currentLoanId = null;

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
        window.addEventListener('click', e => {
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

    function handleAddLoan(e) {
        e.preventDefault();

        const loanName = document.getElementById('loanName').value;
        const loanAmount = parseFloat(document.getElementById('loanAmount').value);
        const interestRate = parseFloat(document.getElementById('interestRate').value);
        const loanTerm = parseInt(document.getElementById('loanTerm').value); // WEEKS
        const startDate = document.getElementById('startDate').value;

        const weeklyPayment = calculateWeeklyPayment(loanAmount, interestRate, loanTerm);
        const paymentSchedule = generatePaymentSchedule(loanAmount, interestRate, loanTerm, startDate);

        const newLoan = {
            id: Date.now().toString(),
            name: loanName,
            originalAmount: loanAmount,
            remainingBalance: loanAmount + (loanAmount * (interestRate / 100)),
            interestRate: interestRate,
            monthlyPayment: weeklyPayment, // used as weekly payment
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

    // =============================
    // ✅ FINAL WEEKLY CALCULATION
    // ONE-TIME INTEREST ONLY
    // =============================

    function calculateWeeklyPayment(amount, rate, weeks) {
        const interest = amount * (rate / 100); // ONE TIME
        const totalPayable = amount + interest;
        return parseFloat((totalPayable / weeks).toFixed(2));
    }

    function generatePaymentSchedule(amount, rate, weeks, startDate) {
        const schedule = [];
        const interest = amount * (rate / 100); // ONE TIME
        const totalPayable = amount + interest;
        const weeklyPayment = totalPayable / weeks;

        let balance = totalPayable;
        const start = new Date(startDate);

        for (let i = 1; i <= weeks; i++) {
            balance -= weeklyPayment;

            const paymentDate = new Date(start);
            paymentDate.setDate(start.getDate() + i * 7);

            schedule.push({
                paymentNumber: i,
                date: paymentDate.toISOString().split('T')[0],
                payment: parseFloat(weeklyPayment.toFixed(2)),
                principal: parseFloat(weeklyPayment.toFixed(2)),
                interest: i === 1 ? interest : 0,
                remainingBalance: Math.max(0, parseFloat(balance.toFixed(2)))
            });
        }
        return schedule;
    }

    function renderLoanTable() {
        const searchTerm = loanSearch.value.toLowerCase();
        const filterValue = loanFilter.value;

        const filteredLoans = loans.filter(loan => {
            const matchesSearch = loan.name.toLowerCase().includes(searchTerm);
            const matchesFilter =
                filterValue === 'all' ||
                (filterValue === 'active' && loan.status === 'active') ||
                (filterValue === 'paid' && loan.status === 'paid');
            return matchesSearch && matchesFilter;
        });

        loanTableBody.innerHTML = '';

        if (filteredLoans.length === 0) {
            loanTableBody.innerHTML = `
                <tr><td colspan="7" class="no-loans">No loans found.</td></tr>`;
            return;
        }

        filteredLoans.forEach(loan => {
            const row = document.createElement('tr');
            row.dataset.id = loan.id;
            row.innerHTML = `
                <td>${loan.name}</td>
                <td>₱${loan.originalAmount.toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
                <td>₱${loan.remainingBalance.toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
                <td>${loan.interestRate}%</td>
                <td>₱${loan.monthlyPayment.toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
                <td><span class="status-badge ${loan.status}">${loan.status}</span></td>
                <td>
                    <button class="view-loan">View</button>
                    <button class="delete-loan">Delete</button>
                </td>
            `;
            loanTableBody.appendChild(row);
        });
    }

    function handleMakePayment(e) {
        e.preventDefault();
        const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
        const loan = loans.find(l => l.id === currentLoanId);
        if (!loan) return;

        loan.remainingBalance = Math.max(0, loan.remainingBalance - paymentAmount);
        if (loan.remainingBalance <= 0) loan.status = 'paid';

        saveLoans();
        renderLoanTable();
        updateStats();
        paymentForm.reset();
        makePaymentModal.style.display = 'none';
    }

    function updateStats() {
        const totalLoans = loans.length;
        const totalBalance = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
        const activeLoan = loans.find(l => l.status === 'active');

        totalLoansEl.textContent = totalLoans;
        totalBalanceEl.textContent = `₱${totalBalance.toLocaleString('en-PH',{minimumFractionDigits:2})}`;
        upcomingPaymentEl.textContent = activeLoan
            ? `₱${activeLoan.monthlyPayment.toLocaleString('en-PH',{minimumFractionDigits:2})}`
            : '₱0.00';
    }

    function saveLoans() {
        localStorage.setItem('loans', JSON.stringify(loans));
    }
});

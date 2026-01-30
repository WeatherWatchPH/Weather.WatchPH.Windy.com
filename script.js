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

// Initialize
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

// =======================
// ADD LOAN
// =======================
function handleAddLoan(e) {
    e.preventDefault();

    const loanName = document.getElementById('loanName').value;
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const interestRate = parseFloat(document.getElementById('interestRate').value);
    const loanTerm = parseInt(document.getElementById('loanTerm').value);
    const startDate = document.getElementById('startDate').value;

    const weeklyPayment = calculateWeeklyPayment(loanAmount, interestRate, loanTerm);
    const paymentSchedule = generatePaymentSchedule(loanAmount, interestRate, loanTerm, startDate);

    const totalInterest = loanAmount * (interestRate / 100);
    const totalPayable = loanAmount + totalInterest;

    const newLoan = {
        id: Date.now().toString(),
        name: loanName,
        originalAmount: loanAmount,
        remainingBalance: totalPayable,
        interestRate: interestRate,
        monthlyPayment: weeklyPayment, // weekly talaga
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

// =======================
// WEEKLY CALCULATION (ONE-TIME INTEREST)
// =======================
function calculateWeeklyPayment(amount, rate, termWeeks) {
    const totalInterest = amount * (rate / 100);
    const

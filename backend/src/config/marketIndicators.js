// Market analysis configuration
const marketIndicators = {
  bearish: [
    'fell',
    'down',
    'lower',
    'decline',
    'drop',
    'negative',
    'bearish',
    'decreased',
    'losses',
    'worried',
    'low',
    'miss',
    'missed',
    'below',
    'disappointing',
    'underperform'
  ],
  
  bullish: [
    'rose',
    'up',
    'higher',
    'gain',
    'surge',
    'positive',
    'bullish',
    'increased',
    'growth',
    'optimistic',
    'high',
    'beat',
    'above',
    'exceed',
    'exceeded',
    'expectations',
    'outperform'
  ],
  
  sectors: {
    tech: ['tech', 'nasdaq', 'software', 'semiconductor', 'ai', 'digital'],
    finance: [
      'banks', 
      'financial', 
      'credit', 
      'lending', 
      'mortgage',
      'investment',
      'asset management',
      'private equity',
      'apollo',
      'blackstone',
      'kkr',
      'earnings',
      'eps',
      'revenue',
      'profit',
      'income',
      'assets under management',
      'aum'
    ],
    healthcare: ['health', 'biotech', 'pharma', 'medical', 'merck', 'pharmaceutical', 'drug', 'medicine', 'healthcare'],
    energy: ['oil', 'gas', 'energy', 'renewable', 'solar']
  },
  
  topics: {
    earnings: [
      'earnings',
      'revenue',
      'profit',
      'eps',
      'quarter',
      'quarterly',
      'guidance',
      'outlook',
      'forecast',
      'expectations'
    ],
    fed: ['fed', 'federal reserve', 'interest rate', 'monetary'],
    inflation: ['inflation', 'cpi', 'price index', 'cost'],
    economy: ['gdp', 'economy', 'economic', 'growth', 'recession'],
    employment: ['jobs', 'employment', 'unemployment', 'payroll', 'labor'],
    pharma: ['drug approval', 'clinical trial', 'fda', 'patent', 'pipeline', 'research', 'development']
  }
};

export default marketIndicators; 
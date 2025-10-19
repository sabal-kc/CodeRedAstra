const { JSDOM } = require('jsdom');
const axe = require('axe-core');

/**
 * Run Axe-Core accessibility tests on HTML content
 */
async function runAccessibilityTests(htmlContent) {
  try {
    // Create a DOM from the HTML with runScripts enabled
    const dom = new JSDOM(htmlContent, {
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true
    });
    const { window } = dom;
    
    // Inject axe-core into the window
    const axeSource = axe.source;
    const script = window.document.createElement('script');
    script.textContent = axeSource;
    window.document.head.appendChild(script);
    
    // Wait for axe to be available
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!window.axe) {
      throw new Error('Axe-core not available in window');
    }
    
    // Configure axe to skip rules that require canvas
    const axeConfig = {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      },
      rules: {
        'color-contrast': { enabled: false }, // Skip color contrast (requires canvas)
        'color-contrast-enhanced': { enabled: false }
      }
    };
    
    // Run axe tests
    const results = await new Promise((resolve, reject) => {
      try {
        window.axe.run(window.document, axeConfig, (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
    
    // Clean up
    window.close();
    
    // Calculate scores
    const score = calculateAccessibilityScore(results);
    
    return {
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      score: score,
      violationsByImpact: categorizeByImpact(results.violations),
      topViolations: getTopViolations(results.violations),
      summary: generateSummary(results, score)
    };
  } catch (error) {
    console.error('Error running accessibility tests:', error);
    throw error;
  }
}

/**
 * Calculate accessibility score (0-100)
 */
function calculateAccessibilityScore(results) {
  const violations = results.violations.length;
  const passes = results.passes.length;
  const total = violations + passes;
  
  if (total === 0) return 100;
  
  // Weight by impact
  let violationWeight = 0;
  results.violations.forEach(violation => {
    const impactWeight = {
      'critical': 10,
      'serious': 5,
      'moderate': 3,
      'minor': 1
    };
    violationWeight += (violation.nodes.length * (impactWeight[violation.impact] || 1));
  });
  
  // Calculate score (100 - penalty)
  const penalty = Math.min(100, (violationWeight / total) * 100);
  return Math.max(0, Math.round(100 - penalty));
}

/**
 * Categorize violations by impact
 */
function categorizeByImpact(violations) {
  const categories = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  };
  
  violations.forEach(violation => {
    if (categories.hasOwnProperty(violation.impact)) {
      categories[violation.impact] += violation.nodes.length;
    }
  });
  
  return categories;
}

/**
 * Get top 5 most critical violations
 */
function getTopViolations(violations) {
  return violations
    .sort((a, b) => {
      const impactOrder = { critical: 4, serious: 3, moderate: 2, minor: 1 };
      return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
    })
    .slice(0, 5)
    .map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodeCount: v.nodes.length
    }));
}

/**
 * Generate human-readable summary
 */
function generateSummary(results, score) {
  const violations = results.violations.length;
  
  if (score >= 90) {
    return `Excellent accessibility! ${violations} issue(s) found.`;
  } else if (score >= 75) {
    return `Good accessibility with ${violations} issue(s) to address.`;
  } else if (score >= 50) {
    return `Moderate accessibility. ${violations} issues need attention.`;
  } else {
    return `Poor accessibility. ${violations} critical issues found.`;
  }
}

/**
 * Compare two accessibility test results
 */
function compareAccessibilityResults(before, after) {
  const improvement = {
    scoreImprovement: after.score - before.score,
    violationsReduced: before.violations - after.violations,
    passesIncreased: after.passes - before.passes,
    percentageImprovement: before.score > 0 
      ? Math.round(((after.score - before.score) / before.score) * 100) 
      : 100
  };
  
  return {
    before,
    after,
    improvement,
    summary: generateComparisonSummary(improvement)
  };
}

/**
 * Generate comparison summary
 */
function generateComparisonSummary(improvement) {
  if (improvement.scoreImprovement > 0) {
    return `✅ Accessibility improved by ${improvement.scoreImprovement} points! ${Math.abs(improvement.violationsReduced)} fewer violation(s).`;
  } else if (improvement.scoreImprovement === 0) {
    return `➡️ No change in accessibility score.`;
  } else {
    return `⚠️ Accessibility decreased by ${Math.abs(improvement.scoreImprovement)} points.`;
  }
}

module.exports = {
  runAccessibilityTests,
  compareAccessibilityResults
};


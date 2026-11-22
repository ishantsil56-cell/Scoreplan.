/* ScorePlan — THE WEIGHTAGE DATA (single source of truth, spec §4).
   Weightage = approx % of that subject's marks, from JEE Main 2023–2025 paper analysis.
   Approximate starter data: edit freely, but keep each subject summing to ~100.
   A future JEE Advanced pack = a second array with this same shape. */
(function (root) {
  var RAW = {
    Physics: [
      ['Units, Dimensions & Errors', 4, 1], ['Kinematics', 5, 2], ['Laws of Motion', 5, 2],
      ['Work, Energy & Power', 4, 2], ['Rotational Motion', 8, 3], ['Gravitation', 3, 1],
      ['Properties of Solids & Liquids', 5, 2], ['Thermodynamics & KTG', 8, 3], ['SHM & Waves', 6, 2],
      ['Electrostatics', 7, 3], ['Current Electricity', 8, 2], ['Magnetism & Moving Charges', 6, 2],
      ['EMI & Alternating Current', 5, 3], ['Ray Optics', 6, 2], ['Wave Optics', 4, 2],
      ['Modern Physics (Atoms, Nuclei, Dual Nature, Semiconductors)', 11, 2],
      ['Experimental Skills / Practical Physics', 5, 1]
    ],
    Chemistry: [
      ['Mole Concept & Stoichiometry', 4, 2], ['Atomic Structure', 3, 2], ['Chemical Bonding', 6, 3],
      ['Thermodynamics (Chemical)', 5, 3], ['Equilibrium (Chemical + Ionic)', 5, 3],
      ['Redox & Electrochemistry', 5, 2], ['Chemical Kinetics', 4, 2], ['Solutions', 3, 2],
      ['Gaseous State & States of Matter', 2, 1], ['Periodic Table & Periodicity', 4, 1],
      ['Coordination Compounds', 6, 3], ['p-Block Elements', 5, 2], ['d & f Block Elements', 4, 2],
      ['Metallurgy (General Principles of Isolation)', 3, 2], ['Hydrogen & s-Block', 3, 1],
      ['Salt Analysis & Practical Chemistry', 3, 2], ['GOC & Isomerism', 6, 3], ['Hydrocarbons', 5, 2],
      ['Haloalkanes & Haloarenes', 3, 2], ['Alcohols, Phenols & Ethers', 4, 2],
      ['Aldehydes & Ketones', 5, 3], ['Carboxylic Acids & Derivatives', 3, 2], ['Amines', 3, 2],
      ['Biomolecules & Polymers', 4, 1], ['Practical Organic Chemistry', 2, 1]
    ],
    Maths: [
      ['Sets, Relations & Functions', 3, 1], ['Complex Numbers', 5, 2], ['Quadratic Equations', 4, 2],
      ['Matrices & Determinants', 7, 2], ['Permutations & Combinations', 4, 3], ['Binomial Theorem', 3, 2],
      ['Sequences & Series', 5, 2], ['Limits, Continuity & Differentiability', 5, 2],
      ['Application of Derivatives', 4, 2], ['Indefinite Integration', 3, 2],
      ['Definite Integration & Area Under Curve', 8, 3], ['Differential Equations', 5, 2],
      ['Straight Lines', 4, 1], ['Circles', 4, 2], ['Conic Sections (Parabola, Ellipse, Hyperbola)', 7, 3],
      ['Vectors', 5, 2], ['3D Geometry', 6, 3], ['Probability', 8, 3], ['Trigonometry', 6, 2],
      ['Statistics & Mathematical Reasoning', 4, 1]
    ]
  };
  var PREFIX = { Physics: 'phy', Chemistry: 'che', Maths: 'mat' };
  var SUBJECTS = ['Physics', 'Chemistry', 'Maths'];
  var SYLLABUS = [];
  SUBJECTS.forEach(function (s) {
    RAW[s].forEach(function (r) {
      SYLLABUS.push({
        id: PREFIX[s] + '-' + r[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        subject: s, name: r[0], weightage: r[1], difficulty: r[2],
        hoursEstimate: r[2] * 2
      });
    });
  });
  function subjectTotals() {
    var t = {};
    SUBJECTS.forEach(function (s) { t[s] = 0; });
    SYLLABUS.forEach(function (c) { t[c.subject] += c.weightage; });
    return t;
  }
  var api = {
    SYLLABUS: SYLLABUS, SUBJECTS: SUBJECTS, subjectTotals: subjectTotals,
    maxWeightage: Math.max.apply(null, SYLLABUS.map(function (c) { return c.weightage; }))
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SPData = api;
})(typeof window !== 'undefined' ? window : globalThis);

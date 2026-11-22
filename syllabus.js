/* ScorePlan — THE WEIGHTAGE DATA (single source of truth, spec §4).
   One "pack" per exam. Weightage = approx % of that subject's marks. Approximate starter data:
   edit freely, but keep each subject summing to ~100 (node test/planner.test.js checks this).
   Add another exam = add another pack with the same shape. */
(function (root) {
  var MAIN = {
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

  var ADV = {
    Physics: [
      ['Units, Dimensions & Experimental Skills', 4, 1], ['Kinematics', 5, 2], ['Laws of Motion & Friction', 6, 2],
      ['Work, Energy & Power', 4, 2], ['Rotational Motion', 8, 3], ['Gravitation', 3, 2],
      ['Properties of Matter (Fluids, Elasticity, Surface Tension)', 5, 2], ['Heat, Thermodynamics & KTG', 8, 3],
      ['Simple Harmonic Motion', 5, 2], ['Waves & Sound', 5, 2], ['Electrostatics & Capacitors', 8, 3],
      ['Current Electricity', 7, 2], ['Magnetism & Moving Charges', 6, 3], ['EMI & Alternating Current', 6, 3],
      ['Ray Optics', 6, 2], ['Wave Optics', 4, 3], ['Modern Physics', 10, 2]
    ],
    Chemistry: [
      ['Mole Concept & Stoichiometry', 4, 2], ['Atomic Structure', 4, 2], ['Chemical Bonding & Molecular Structure', 5, 3],
      ['Chemical Thermodynamics', 5, 3], ['Chemical & Ionic Equilibrium', 5, 3], ['Redox & Electrochemistry', 5, 2],
      ['Chemical Kinetics', 4, 2], ['Solutions & Colligative Properties', 3, 2], ['Gaseous & Solid State', 3, 2],
      ['Periodic Table & Periodicity', 3, 1], ['Coordination Compounds', 6, 3], ['p-Block Elements', 5, 2],
      ['d & f Block Elements', 4, 2], ['Hydrogen & s-Block', 2, 1], ['Metallurgy', 3, 2], ['Qualitative Salt Analysis', 4, 2],
      ['GOC & Isomerism', 6, 3], ['Hydrocarbons', 5, 2], ['Haloalkanes & Haloarenes', 3, 2],
      ['Alcohols, Phenols & Ethers', 4, 2], ['Aldehydes & Ketones', 5, 3], ['Carboxylic Acids & Derivatives', 3, 2],
      ['Amines & Diazonium Salts', 3, 2], ['Biomolecules & Polymers', 4, 1], ['Named Reactions & Practical Organic', 2, 2]
    ],
    Maths: [
      ['Sets, Relations & Functions', 4, 1], ['Complex Numbers', 5, 2], ['Quadratic Equations & Inequalities', 4, 2],
      ['Sequences & Series', 4, 2], ['Permutations & Combinations', 4, 3], ['Binomial Theorem', 4, 2],
      ['Matrices & Determinants', 6, 2], ['Probability', 8, 3], ['Limits, Continuity & Differentiability', 7, 3],
      ['Application of Derivatives', 6, 3], ['Indefinite Integration', 3, 2], ['Definite Integration & Area', 8, 3],
      ['Differential Equations', 5, 2], ['Straight Lines', 4, 1], ['Circles', 4, 2],
      ['Parabola, Ellipse & Hyperbola', 8, 3], ['Vectors', 5, 2], ['3D Geometry', 5, 3], ['Trigonometry & Inverse Trigonometry', 6, 2]
    ]
  };
  var NEET = {
    Physics: [
      ['Physical World & Measurement', 3, 1], ['Kinematics', 6, 2], ['Laws of Motion', 6, 2], ['Work, Energy & Power', 4, 2],
      ['System of Particles & Rotational Motion', 5, 3], ['Gravitation', 4, 2], ['Properties of Bulk Matter', 5, 2],
      ['Thermodynamics', 5, 2], ['Kinetic Theory of Gases', 3, 2], ['Oscillations & Waves', 6, 2], ['Electrostatics', 7, 2],
      ['Current Electricity', 8, 2], ['Magnetic Effects of Current & Magnetism', 6, 2], ['EMI & Alternating Current', 6, 2],
      ['Electromagnetic Waves', 2, 1], ['Optics (Ray & Wave)', 10, 2], ['Dual Nature of Matter & Radiation', 4, 1],
      ['Atoms & Nuclei', 5, 2], ['Electronic Devices', 5, 2]
    ],
    Chemistry: [
      ['Some Basic Concepts of Chemistry', 5, 2], ['Structure of Atom', 5, 2], ['Classification & Periodicity', 4, 1],
      ['Chemical Bonding & Molecular Structure', 7, 2], ['States of Matter', 2, 1], ['Chemical Thermodynamics', 5, 2],
      ['Equilibrium', 7, 2], ['Redox Reactions', 3, 2], ['Solutions', 3, 2], ['Electrochemistry', 5, 2], ['Chemical Kinetics', 3, 2],
      ['Hydrogen & s-Block Elements', 3, 1], ['p-Block Elements', 6, 2], ['d & f Block Elements', 4, 2],
      ['Coordination Compounds', 5, 2], ['GOC & Isomerism', 8, 2], ['Hydrocarbons', 5, 2], ['Haloalkanes & Haloarenes', 3, 2],
      ['Alcohols, Phenols & Ethers', 4, 2], ['Aldehydes, Ketones & Carboxylic Acids', 6, 2], ['Amines', 3, 2], ['Biomolecules', 4, 1]
    ],
    Botany: [
      ['The Living World', 2, 1], ['Biological Classification', 3, 1], ['Plant Kingdom', 5, 2], ['Morphology of Flowering Plants', 6, 2],
      ['Anatomy of Flowering Plants', 5, 2], ['Cell: The Unit of Life', 4, 2], ['Cell Cycle & Cell Division', 6, 2],
      ['Biomolecules', 5, 2], ['Photosynthesis in Higher Plants', 6, 2], ['Respiration in Plants', 5, 2],
      ['Plant Growth & Development', 4, 1], ['Transport in Plants', 4, 2], ['Mineral Nutrition', 3, 1],
      ['Sexual Reproduction in Flowering Plants', 8, 2], ['Principles of Inheritance & Variation', 9, 3],
      ['Molecular Basis of Inheritance', 9, 3], ['Ecosystem', 4, 2], ['Biodiversity & Conservation', 3, 1],
      ['Organisms & Populations', 4, 2], ['Microbes in Human Welfare', 2, 1], ['Biotechnology: Principles & Applications', 3, 2]
    ],
    Zoology: [
      ['Animal Kingdom', 7, 2], ['Structural Organisation in Animals', 6, 2], ['Breathing & Exchange of Gases', 7, 2],
      ['Body Fluids & Circulation', 8, 2], ['Excretory Products & Elimination', 7, 2], ['Locomotion & Movement', 6, 2],
      ['Neural Control & Coordination', 8, 2], ['Chemical Coordination & Integration', 7, 2], ['Digestion & Absorption', 6, 2],
      ['Human Reproduction', 10, 2], ['Reproductive Health', 5, 1], ['Evolution', 7, 2], ['Human Health & Disease', 9, 2],
      ['Strategies for Enhancement in Food Production', 3, 1], ['Reproduction in Organisms', 4, 1]
    ]
  };

  function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function build(raw, subjects, prefixes, meta) {
    var chapters = [];
    subjects.forEach(function (s) {
      raw[s].forEach(function (r) {
        chapters.push({
          id: prefixes[s] + '-' + slug(r[0]), subject: s, name: r[0], weightage: r[1], difficulty: r[2],
          hoursEstimate: r[2] * 2
        });
      });
    });
    meta.subjects = subjects; meta.chapters = chapters;
    meta.maxWeightage = Math.max.apply(null, chapters.map(function (c) { return c.weightage; }));
    return meta;
  }
  var PACKS = {
    main: build(MAIN, ['Physics', 'Chemistry', 'Maths'], { Physics: 'phy', Chemistry: 'che', Maths: 'mat' },
      { id: 'main', label: 'JEE Main', defaultName: 'JEE Main 2027', defaultDate: '2027-01-20', papers: 'JEE Main' }),
    adv: build(ADV, ['Physics', 'Chemistry', 'Maths'], { Physics: 'adv-phy', Chemistry: 'adv-che', Maths: 'adv-mat' },
      { id: 'adv', label: 'JEE Advanced', defaultName: 'JEE Advanced 2027', defaultDate: '2027-05-23', papers: 'JEE Advanced' }),
    neet: build(NEET, ['Physics', 'Chemistry', 'Botany', 'Zoology'], { Physics: 'neet-phy', Chemistry: 'neet-che', Botany: 'neet-bot', Zoology: 'neet-zoo' },
      { id: 'neet', label: 'NEET UG', defaultName: 'NEET UG 2027', defaultDate: '2027-05-02', papers: 'NEET UG' })
  };
  var ORDER = ['main', 'adv', 'neet'];
  function getPack(id) { return PACKS[id] || PACKS.main; }
  function subjectTotals(pack) {
    pack = pack || PACKS.main; var t = {};
    pack.subjects.forEach(function (s) { t[s] = 0; });
    pack.chapters.forEach(function (c) { t[c.subject] += c.weightage; });
    return t;
  }
  var api = {
    PACKS: PACKS, ORDER: ORDER, getPack: getPack, subjectTotals: subjectTotals,
    SYLLABUS: PACKS.main.chapters, SUBJECTS: PACKS.main.subjects, maxWeightage: PACKS.main.maxWeightage   // JEE Main (back-compat for tests)
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SPData = api;
})(typeof window !== 'undefined' ? window : globalThis);

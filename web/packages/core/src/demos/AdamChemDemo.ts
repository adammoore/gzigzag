/**
 * Adam's Authentic Chemistry Demo - Faithful Recreation
 * Based on original GzigZag biochemistry demonstration
 * Enhanced with periodic table, biochemical pathways, and research integration
 */

import { ZZSpace } from '../index';

/**
 * Creates Adam's comprehensive chemistry demonstration
 * Includes periodic table, biochemical pathways, and research connections
 */
export function createAdamChemDemo(): ZZSpace {
  const space = new ZZSpace('adam_chemistry_demo');
  const home = space.getHomeCell();
  home.text = 'Adam\'s Chemistry Demo';

  console.log('🧬 Creating Adam\'s Authentic Chemistry ZigZag Structure...');

  // Register custom biochemical dimensions
  const customDimensions = [
    'd.pdb',           // Protein Data Bank connections
    'd.swissprot',     // SwissProt database links
    'd.het',           // Heterogen/ligand relationships
    'd.homology',      // Homology relationships
    'd.journal',       // Journal article connections
    'd.ref',           // Reference citations
    'd.disease',       // Disease associations
    'd.sufferer',      // Disease sufferers
    'd.cycle',         // Biochemical cycle closure
    'd.metabolism',    // Amino acid metabolism connections
    'd.energy',        // Energy production connections
    'd.requires',      // Cofactor requirements
    'd.produces',      // Products generated
    'd.consumes',      // Reactants consumed  
    'd.yields',        // Products yielded
    'd.ptablex',       // Periodic table X-axis
    'd.ptabley',       // Periodic table Y-axis
    'd.in-out',        // Input/output relationships
    'd.biochem',       // Biochemical pathway connections
    'd.elements',      // Chemical element relationships
    'd.cofactors'      // Enzyme cofactor relationships
  ];

  customDimensions.forEach(dim => space.registerDimension(dim));

  // === 1. PERIODIC TABLE STRUCTURE ===
  console.log('Building periodic table...');
  const periodicTable = home.newCell('d.1', 1, 'Periodic Table');
  const elements = periodicTable.newCell('d.2', 1, 'Elements');

  // Create detailed element entries with properties
  const elementData = [
    { symbol: 'H', name: 'Hydrogen', atomicMass: '1.008', density: '0.09', meltingPoint: '14.0', boilingPoint: '20.4' },
    { symbol: 'He', name: 'Helium', atomicMass: '4.00', density: '0.17', meltingPoint: '1.0', boilingPoint: '4.2' },
    { symbol: 'Li', name: 'Lithium', atomicMass: '6.94', density: '534.00', meltingPoint: '452.0', boilingPoint: '1590.0' },
    { symbol: 'Be', name: 'Beryllium', atomicMass: '9.01', density: '1800.00', meltingPoint: '1550.0', boilingPoint: '3243.0' },
    { symbol: 'B', name: 'Boron', atomicMass: '10.81', density: '2500.00', meltingPoint: '2600.0', boilingPoint: '2820.0' },
    { symbol: 'C', name: 'Carbon', atomicMass: '12.01', density: '2300.00', meltingPoint: '3800.0', boilingPoint: '5100.0' },
    { symbol: 'N', name: 'Nitrogen', atomicMass: '14.01', density: '1.17', meltingPoint: '63.3', boilingPoint: '77.3' },
    { symbol: 'O', name: 'Oxygen', atomicMass: '16.00', density: '1.33', meltingPoint: '54.7', boilingPoint: '90.2' },
    { symbol: 'F', name: 'Fluorine', atomicMass: '19.00', density: '1.70', meltingPoint: '53.5', boilingPoint: '85.0' },
    { symbol: 'Ne', name: 'Neon', atomicMass: '20.18', density: '0.84', meltingPoint: '24.5', boilingPoint: '27.2' },
    // Biochemically important elements
    { symbol: 'Na', name: 'Sodium', atomicMass: '22.99', density: '970.00', meltingPoint: '371.0', boilingPoint: '1165.0' },
    { symbol: 'Mg', name: 'Magnesium', atomicMass: '24.31', density: '1741.00', meltingPoint: '924.0', boilingPoint: '1380.0' },
    { symbol: 'P', name: 'Phosphorus', atomicMass: '30.97', density: '2200.00', meltingPoint: '317.2', boilingPoint: '552.0' },
    { symbol: 'S', name: 'Sulfur', atomicMass: '32.06', density: '2070.00', meltingPoint: '386.0', boilingPoint: '717.7' },
    { symbol: 'K', name: 'Potassium', atomicMass: '39.10', density: '860.00', meltingPoint: '336.8', boilingPoint: '1047.0' },
    { symbol: 'Ca', name: 'Calcium', atomicMass: '40.08', density: '1540.00', meltingPoint: '1120.0', boilingPoint: '1760.0' },
    { symbol: 'Fe', name: 'Iron', atomicMass: '55.85', density: '7870.00', meltingPoint: '1808.0', boilingPoint: '3300.0' },
    { symbol: 'Cu', name: 'Copper', atomicMass: '63.55', density: '8930.00', meltingPoint: '1356.0', boilingPoint: '2868.0' },
    { symbol: 'Zn', name: 'Zinc', atomicMass: '65.37', density: '7140.00', meltingPoint: '692.6', boilingPoint: '1180.0' }
  ];

  let prevElement = elements;
  const elementCells: { [key: string]: any } = {};

  elementData.forEach((element) => {
    const elementCell = prevElement.newCell('d.1', 1, element.symbol);
    const nameCell = elementCell.newCell('d.2', 1, element.name);
    const massCell = nameCell.newCell('d.2', 1, `${element.atomicMass} g/mol`);
    const densityCell = massCell.newCell('d.2', 1, `${element.density} kg/m³`);
    const meltingCell = densityCell.newCell('d.2', 1, `MP: ${element.meltingPoint}K`);
    meltingCell.newCell('d.2', 1, `BP: ${element.boilingPoint}K`);
    
    elementCells[element.symbol] = elementCell;
    prevElement = elementCell;
  });

  // === 2. ENHANCED KREBS CYCLE WITH COFACTORS ===
  console.log('Building enhanced Krebs cycle...');
  const biochemPathways = home.newCell('d.1', -1, 'Biochemical Pathways');
  const krebsCycle = biochemPathways.newCell('d.2', 1, 'Krebs Cycle (Citric Acid Cycle)');
  
  // Create detailed Krebs cycle intermediates with molecular formulas
  const krebsCompounds = [
    { name: 'Acetyl-CoA', formula: 'C23H38N7O17P3S', mw: '809.57' },
    { name: 'Citrate', formula: 'C6H8O7', mw: '192.12' },
    { name: 'cis-Aconitate', formula: 'C6H6O6', mw: '174.11' },
    { name: 'Isocitrate', formula: 'C6H8O7', mw: '192.12' },
    { name: 'α-Ketoglutarate', formula: 'C5H6O5', mw: '146.10' },
    { name: 'Succinyl-CoA', formula: 'C25H40N7O19P3S', mw: '867.61' },
    { name: 'Succinate', formula: 'C4H6O4', mw: '118.09' },
    { name: 'Fumarate', formula: 'C4H4O4', mw: '116.07' },
    { name: 'Malate', formula: 'C4H6O5', mw: '134.09' },
    { name: 'Oxaloacetate', formula: 'C4H4O5', mw: '132.07' }
  ];

  let currentCompound = krebsCycle;
  const compoundCells: { [key: string]: any } = {};

  krebsCompounds.forEach((compound) => {
    const compoundCell = currentCompound.newCell('d.biochem', 1, compound.name);
    const formulaCell = compoundCell.newCell('d.2', 1, `Formula: ${compound.formula}`);
    formulaCell.newCell('d.2', 1, `MW: ${compound.mw} g/mol`);
    
    compoundCells[compound.name] = compoundCell;
    currentCompound = compoundCell;
  });

  // Complete the cycle - Oxaloacetate connects back to Acetyl-CoA to close the loop
  // Note: We use a different dimension to avoid double-connection issues
  compoundCells['Oxaloacetate'].connect('d.cycle', compoundCells['Acetyl-CoA']);

  // === 3. COFACTORS AND COENZYMES ===
  console.log('Adding cofactors and coenzymes...');
  const cofactors = biochemPathways.newCell('d.2', -1, 'Cofactors & Coenzymes');
  
  const cofactorData = [
    { name: 'NAD+', fullName: 'Nicotinamide Adenine Dinucleotide', formula: 'C21H27N7O14P2' },
    { name: 'NADH', fullName: 'Reduced NAD+', formula: 'C21H29N7O14P2' },
    { name: 'FAD', fullName: 'Flavin Adenine Dinucleotide', formula: 'C27H33N9O15P2' },
    { name: 'FADH2', fullName: 'Reduced FAD', formula: 'C27H35N9O15P2' },
    { name: 'CoA-SH', fullName: 'Coenzyme A', formula: 'C21H36N7O16P3S' },
    { name: 'ATP', fullName: 'Adenosine Triphosphate', formula: 'C10H16N5O13P3' },
    { name: 'ADP', fullName: 'Adenosine Diphosphate', formula: 'C10H15N5O10P2' },
    { name: 'GTP', fullName: 'Guanosine Triphosphate', formula: 'C10H16N5O14P3' },
    { name: 'GDP', fullName: 'Guanosine Diphosphate', formula: 'C10H15N5O11P2' }
  ];

  let prevCofactor = cofactors;
  const cofactorCells: { [key: string]: any } = {};

  cofactorData.forEach((cofactor) => {
    const cofactorCell = prevCofactor.newCell('d.1', 1, cofactor.name);
    const fullNameCell = cofactorCell.newCell('d.2', 1, cofactor.fullName);
    fullNameCell.newCell('d.2', 1, cofactor.formula);
    
    cofactorCells[cofactor.name] = cofactorCell;
    prevCofactor = cofactorCell;
  });

  // === 4. BIOCHEMICAL REACTIONS WITH COFACTORS ===
  console.log('Connecting reactions with cofactors...');
  // Note: Multiple reactions use same cofactors, so we connect via different semantic dimensions
  
  // Citrate → Isocitrate (via aconitase) - Note: This step doesn't use NAD+ in reality
  // compoundCells['Citrate'].connect('d.requires', cofactorCells['NAD+']);
  // compoundCells['Isocitrate'].connect('d.produces', cofactorCells['NADH']);

  // Isocitrate → α-Ketoglutarate (isocitrate dehydrogenase) - Uses NAD+
  compoundCells['Isocitrate'].connect('d.consumes', cofactorCells['NAD+']);
  compoundCells['α-Ketoglutarate'].connect('d.produces', cofactorCells['NADH']);

  // α-Ketoglutarate → Succinyl-CoA (α-ketoglutarate dehydrogenase complex)
  compoundCells['α-Ketoglutarate'].connect('d.requires', cofactorCells['NAD+']);
  compoundCells['α-Ketoglutarate'].connect('d.needs', cofactorCells['CoA-SH']);
  compoundCells['Succinyl-CoA'].connect('d.yields', cofactorCells['NADH']);

  // Succinyl-CoA → Succinate (succinyl-CoA synthetase)
  compoundCells['Succinyl-CoA'].connect('d.requires', cofactorCells['GDP']);
  compoundCells['Succinate'].connect('d.produces', cofactorCells['GTP']);

  // Succinate → Fumarate (succinate dehydrogenase)
  compoundCells['Succinate'].connect('d.requires', cofactorCells['FAD']);
  compoundCells['Fumarate'].connect('d.produces', cofactorCells['FADH2']);

  // Malate → Oxaloacetate (malate dehydrogenase)
  compoundCells['Malate'].connect('d.utilizes', cofactorCells['NAD+']);
  compoundCells['Oxaloacetate'].connect('d.yields', cofactorCells['NADH']);

  // === 5. AMINO ACID METABOLISM ===
  console.log('Adding amino acid connections...');
  const aminoAcids = biochemPathways.newCell('d.2', 1, 'Amino Acid Metabolism');
  
  const aminoAcidData = [
    'Alanine', 'Arginine', 'Asparagine', 'Aspartate', 'Cysteine',
    'Glutamate', 'Glutamine', 'Glycine', 'Histidine', 'Isoleucine',
    'Leucine', 'Lysine', 'Methionine', 'Phenylalanine', 'Proline',
    'Serine', 'Threonine', 'Tryptophan', 'Tyrosine', 'Valine'
  ];

  let prevAA = aminoAcids;
  aminoAcidData.forEach((aa) => {
    const aaCell = prevAA.newCell('d.1', 1, aa);
    prevAA = aaCell;
  });

  // Connect amino acids to Krebs cycle intermediates
  const aspartate = aminoAcids.step('d.1', 1)?.step('d.1', 1)?.step('d.1', 1);
  if (aspartate) {
    aspartate.connect('d.metabolism', compoundCells['Oxaloacetate']);
  }

  // === 6. PROTEIN STRUCTURE REFERENCES ===
  console.log('Adding protein database connections...');
  const proteins = home.newCell('d.1', 1, 'Protein Structures');
  const biotin = proteins.newCell('d.2', 1, 'Biotin');
  const streptavidin = biotin.newCell('d.2', 1, 'Streptavidin');
  const avidin = streptavidin.newCell('d.1', 1, 'Avidin');

  // Add PDB entries
  const pdb1stp = streptavidin.newCell('d.pdb', 1, '1STP');
  const resolution1 = pdb1stp.newCell('d.2', 1, '2.7Å Resolution');
  resolution1.newCell('d.2', 1, 'Streptavidin-Biotin Complex');

  const pdb2avi = avidin.newCell('d.pdb', 1, '2AVI');
  const avidinDesc = pdb2avi.newCell('d.2', 1, 'Egg-white Avidin');
  avidinDesc.newCell('d.2', 1, 'Functional Complex with Biotin');

  // SwissProt entries
  const sp_strep = streptavidin.newCell('d.swissprot', 1, 'AVID_STREP');
  sp_strep.newCell('d.2', 1, 'Streptomyces avidinii');
  
  const sp_chick = avidin.newCell('d.swissprot', 1, 'AVID_CHICK');
  sp_chick.newCell('d.2', 1, 'Gallus gallus');

  // === 7. JOURNAL REFERENCES ===
  console.log('Adding research citations...');
  const literature = home.newCell('d.1', -1, 'Research Literature');
  const jmb = literature.newCell('d.journal', 1, 'J. Mol. Biol.');
  const science = jmb.newCell('d.journal', 1, 'Science');

  // Add specific papers
  const paper1 = jmb.newCell('d.2', 1, 'Structural Origins of Biotin Binding');
  const vol1 = paper1.newCell('d.2', 1, 'Volume 231, Pages 698-710 (1993)');
  vol1.newCell('d.2', 1, 'F. R. Salemme, J. J. Wendoloski');
  paper1.connect('d.ref', pdb1stp);

  const paper2 = science.newCell('d.2', 1, '3D Structure of Avidin-Biotin Complex');
  const vol2 = paper2.newCell('d.2', 1, 'Volume 243, Pages 85-88 (1989)');  
  vol2.newCell('d.2', 1, 'P. C. Weber, D. H. Ohlendorf');
  paper2.connect('d.ref', pdb2avi);

  // === 8. DISEASES AND CONDITIONS ===
  console.log('Adding disease associations...');
  const diseases = home.newCell('d.1', 1, 'Diseases & Conditions');
  const porphyria = diseases.newCell('d.disease', 1, 'Porphyria');
  const kingGeorge = porphyria.newCell('d.sufferer', 1, 'King George III');
  
  // Connect to biochemical pathways
  // Link King George to his condition
  kingGeorge.connect('d.disease', porphyria);
  const heme = biochemPathways.newCell('d.2', 1, 'Heme Biosynthesis');
  porphyria.connect('d.biochem', heme);

  // === 9. ELEMENTAL COMPOSITION ANALYSIS ===
  console.log('Connecting compounds to elements...');
  // Connect biochemical compounds to their constituent elements
  compoundCells['Citrate'].connect('d.elements', elementCells['C']);
  compoundCells['Citrate'].connect('d.elements', elementCells['H']);
  compoundCells['Citrate'].connect('d.elements', elementCells['O']);

  cofactorCells['NAD+'].connect('d.elements', elementCells['C']);
  cofactorCells['NAD+'].connect('d.elements', elementCells['H']);
  cofactorCells['NAD+'].connect('d.elements', elementCells['N']);
  cofactorCells['NAD+'].connect('d.elements', elementCells['O']);
  cofactorCells['NAD+'].connect('d.elements', elementCells['P']);

  // === 10. ENERGY CALCULATIONS ===
  console.log('Adding energy relationships...');
  const energy = biochemPathways.newCell('d.2', 1, 'Energy');
  const atp = energy.newCell('d.1', 1, 'ATP Production');
  const atpYield = atp.newCell('d.2', 1, '~30-32 ATP per glucose');
  atpYield.newCell('d.2', 1, '~7.3 kcal/mol per ATP');

  // Connect to Krebs cycle
  atp.connect('d.energy', compoundCells['Citrate']);

  console.log('✅ Adam\'s Enhanced Chemistry Demo Complete!');
  console.log(`🔬 Created ${space.getCells().length} cells with ${space.getDimensions().length} dimensions`);
  console.log(`📚 Includes: Periodic Table, Krebs Cycle, Cofactors, Proteins, Literature, Diseases`);

  return space;
}

/**
 * Creates a simplified demo animation path through the chemistry structure
 */
export function animateAdamChemDemo(space: ZZSpace): string[] {
  const home = space.getHomeCell();
  const path: string[] = [home.id];

  try {
    // Navigate through the main chemistry structure
    let current = home;
    
    // Go to periodic table
    const periodicTable = current.step('d.1', 1);
    if (periodicTable) {
      path.push(periodicTable.id);
      current = periodicTable;
      
      // Show some elements
      const elements = current.step('d.2', 1);
      if (elements) {
        path.push(elements.id);
        current = elements;
        
        // Show hydrogen, carbon, nitrogen, oxygen
        for (let i = 0; i < 4; i++) {
          const element = current.step('d.1', 1);
          if (element) {
            path.push(element.id);
            current = element;
          }
        }
      }
    }

    // Navigate to biochemical pathways
    current = home;
    const pathways = current.step('d.1', -1);
    if (pathways) {
      path.push(pathways.id);
      current = pathways;
      
      // Show Krebs cycle
      const krebs = current.step('d.2', 1);
      if (krebs) {
        path.push(krebs.id);
        current = krebs;
        
        // Navigate through Krebs cycle compounds
        for (let i = 0; i < 8; i++) {
          const compound = current.step('d.biochem', 1);
          if (compound) {
            path.push(compound.id);
            current = compound;
          }
        }
      }
    }

    // Show protein structures
    current = home;
    const proteins = current.step('d.1', 1);
    if (proteins) {
      path.push(proteins.id);
    }

  } catch (error) {
    console.warn('Animation path generation error:', error);
  }

  return path;
}
/**
 * Investigation catalog — transcribed verbatim from the hospital's paper forms:
 *   - LAB REQUEST FORM (Jayadev Memorial Rashtrotthana Hospital)
 *   - RADIOLOGY REQUEST FORM (JMR/FO/2024/143)
 *
 * `group` mirrors the printed column/section header on the paper form and maps
 * 1:1 onto `MasterLabTest.department` / `MasterRadiologyTest.department`.
 * Tests are listed in the same order they appear on the form so staff can
 * cross-check the digital grid against the paper sheet.
 *
 * This is seed data only. Once inserted (see investigation-seeder.service.ts),
 * the live catalog is read back from the API and grouped by `department` to
 * render the grid. Edit here, re-seed, if the lab menu changes.
 *
 * NOTE: a few rows on page 2 are printed under the "CULTURE & SENSITIVITY"
 * column but are not strictly cultures (HAV IgM, CSF Analysis, RA Factor,
 * Rubella, Mantoux, Pap Smear, Procalcitonin). They are kept under the printed
 * header to stay faithful to the paper layout — flag for the lab if you'd
 * rather re-file them.
 */

export interface CatalogSeedItem {
  description: string;
  department: string; // printed section/column header
}

/** Lab tests, grouped by the paper form's section headers (page 1 + page 2). */
export const LAB_TEST_SEED: CatalogSeedItem[] = [
  // ───────────────── HEMATOLOGY ─────────────────
  { department: 'HEMATOLOGY', description: 'Complete Haemogram (CBC, PS, ESR)' },
  { department: 'HEMATOLOGY', description: 'Peripheral Smear' },
  { department: 'HEMATOLOGY', description: 'ESR' },
  { department: 'HEMATOLOGY', description: 'CBC with ESR' },
  { department: 'HEMATOLOGY', description: 'CBC (Complete Blood Count)' },
  { department: 'HEMATOLOGY', description: 'Total Count' },
  { department: 'HEMATOLOGY', description: 'Absolute Eosinophil Count' },
  { department: 'HEMATOLOGY', description: 'Blood Grouping & Rh Typing' },
  { department: 'HEMATOLOGY', description: 'Haemoglobin' },
  { department: 'HEMATOLOGY', description: 'Differential Count' },
  { department: 'HEMATOLOGY', description: 'Haematocrit (PCV)' },
  { department: 'HEMATOLOGY', description: 'CRP' },
  { department: 'HEMATOLOGY', description: 'Coombs Test - Direct' },
  { department: 'HEMATOLOGY', description: 'Coombs Test - Indirect' },

  // ───────────────── LFT (LIVER FUNCTION TEST) ─────────────────
  { department: 'LFT', description: 'SGOT' },
  { department: 'LFT', description: 'SGPT' },
  { department: 'LFT', description: 'Albumin' },
  { department: 'LFT', description: 'Alkaline Phosphatase' },
  { department: 'LFT', description: 'Bilirubin - Direct' },
  { department: 'LFT', description: 'Bilirubin - Indirect' },
  { department: 'LFT', description: 'Bilirubin - Total' },
  { department: 'LFT', description: 'GGT' },
  { department: 'LFT', description: 'Globulin' },
  { department: 'LFT', description: 'Albumin-Globulin Ratio' },
  { department: 'LFT', description: 'Protein' },

  // ───────────────── OTHERS ─────────────────
  { department: 'OTHERS', description: 'Fasting Glucose (FBS)' },
  { department: 'OTHERS', description: 'Post Prandial Glucose (PPBS)' },
  { department: 'OTHERS', description: 'Random Glucose (RBS)' },
  { department: 'OTHERS', description: 'HbA1c' },
  { department: 'OTHERS', description: 'Vitamin D' },
  { department: 'OTHERS', description: 'Vitamin B12' },
  { department: 'OTHERS', description: 'ABG' },
  { department: 'OTHERS', description: 'Amylase' },
  { department: 'OTHERS', description: 'Lipase' },
  { department: 'OTHERS', description: 'D-Dimer' },
  { department: 'OTHERS', description: 'Beta HCG' },
  { department: 'OTHERS', description: 'Glucose Tolerance Test (GTT)' },
  { department: 'OTHERS', description: 'Folic Acid' },

  // ───────────────── KFT/RFT (RENAL FUNCTION TEST) ─────────────────
  { department: 'KFT/RFT', description: 'Blood Urea Nitrogen (BUN)' },
  { department: 'KFT/RFT', description: 'Calcium' },
  { department: 'KFT/RFT', description: 'Creatinine' },
  { department: 'KFT/RFT', description: 'Urea' },
  { department: 'KFT/RFT', description: 'Uric Acid' },
  { department: 'KFT/RFT', description: 'Electrolytes (Na+, K+, Chloride)' },

  // ───────────────── LIPID PROFILE ─────────────────
  { department: 'LIPID PROFILE', description: 'Cholesterol - Total' },
  { department: 'LIPID PROFILE', description: 'Chol : Ratio' },
  { department: 'LIPID PROFILE', description: 'HDL - Cholesterol' },
  { department: 'LIPID PROFILE', description: 'LDL - Cholesterol' },
  { department: 'LIPID PROFILE', description: 'Triglycerides (TGL)' },
  { department: 'LIPID PROFILE', description: 'VLDL' },

  // ───────────────── IRON PROFILE ─────────────────
  { department: 'IRON PROFILE', description: 'Ferritin' },
  { department: 'IRON PROFILE', description: 'TIBC - Total Iron Binding Capacity' },
  { department: 'IRON PROFILE', description: 'Transferrin' },
  { department: 'IRON PROFILE', description: 'Total Iron' },
  { department: 'IRON PROFILE', description: 'Transferrin Saturation' },
  { department: 'IRON PROFILE', description: 'UIBC' },

  // ───────────────── COAGULATION PROFILE ─────────────────
  { department: 'COAGULATION PROFILE', description: 'PT INR' },
  { department: 'COAGULATION PROFILE', description: 'APTT' },
  { department: 'COAGULATION PROFILE', description: 'Bleeding Time' },
  { department: 'COAGULATION PROFILE', description: 'Clotting Time' },

  // ───────────────── ELECTROLYTES ─────────────────
  { department: 'ELECTROLYTES', description: 'Sodium' },
  { department: 'ELECTROLYTES', description: 'Potassium' },
  { department: 'ELECTROLYTES', description: 'Chloride' },
  { department: 'ELECTROLYTES', description: 'Calcium' },

  // ───────────────── MINERALS ─────────────────
  { department: 'MINERALS', description: 'Calcium' },
  { department: 'MINERALS', description: 'Magnesium' },
  { department: 'MINERALS', description: 'Phosphorus' },

  // ───────────────── CLINICAL PATHOLOGY ─────────────────
  { department: 'CLINICAL PATHOLOGY', description: 'Urine Routine' },
  { department: 'CLINICAL PATHOLOGY', description: 'Urine for Sugar' },
  { department: 'CLINICAL PATHOLOGY', description: '24 Hrs Urine Protein' },
  { department: 'CLINICAL PATHOLOGY', description: 'Urine for Albumin' },
  { department: 'CLINICAL PATHOLOGY', description: 'Urine for Pregnancy' },
  { department: 'CLINICAL PATHOLOGY', description: 'Urine for Microalbumin' },
  { department: 'CLINICAL PATHOLOGY', description: 'Urine for Bile Salt/Bile Pigment' },
  { department: 'CLINICAL PATHOLOGY', description: 'Urine for Ketone Bodies' },
  { department: 'CLINICAL PATHOLOGY', description: 'Semen Analysis' },
  { department: 'CLINICAL PATHOLOGY', description: 'Stool Occult Blood' },
  { department: 'CLINICAL PATHOLOGY', description: 'Stool Complete Analysis' },

  // ───────────────── THYROID ─────────────────
  { department: 'THYROID', description: 'TSH' },
  { department: 'THYROID', description: 'T3' },
  { department: 'THYROID', description: 'T4' },
  { department: 'THYROID', description: 'Free T3' },
  { department: 'THYROID', description: 'Free T4' },
  { department: 'THYROID', description: 'Anti TPO' },

  // ───────────────── ENDOCRINOLOGY ─────────────────
  { department: 'ENDOCRINOLOGY', description: 'ACTH' },
  { department: 'ENDOCRINOLOGY', description: 'Aldosterone' },
  { department: 'ENDOCRINOLOGY', description: 'FSH' },
  { department: 'ENDOCRINOLOGY', description: 'Growth Hormone' },
  { department: 'ENDOCRINOLOGY', description: 'LH' },
  { department: 'ENDOCRINOLOGY', description: 'Progesterone' },
  { department: 'ENDOCRINOLOGY', description: 'Prolactin' },
  { department: 'ENDOCRINOLOGY', description: 'PTH' },
  { department: 'ENDOCRINOLOGY', description: 'Testosterone' },
  { department: 'ENDOCRINOLOGY', description: 'Estradiol II (E2)' },

  // ───────────────── SPECIAL TEST ─────────────────
  { department: 'SPECIAL TEST', description: 'Estriol' },
  { department: 'SPECIAL TEST', description: 'Double Marker Test' },
  { department: 'SPECIAL TEST', description: 'Triple Marker Test' },
  { department: 'SPECIAL TEST', description: 'Quadruple Marker Test' },

  // ───────────────── MICROBIOLOGY ─────────────────
  { department: 'MICROBIOLOGY', description: 'Adenosine Deaminase (ADA)' },
  { department: 'MICROBIOLOGY', description: 'Sputum AFB' },
  { department: 'MICROBIOLOGY', description: 'ANA Profile' },
  { department: 'MICROBIOLOGY', description: 'ANCA' },
  { department: 'MICROBIOLOGY', description: 'Anti CCP' },
  { department: 'MICROBIOLOGY', description: 'Anti-ds DNA' },
  { department: 'MICROBIOLOGY', description: 'Anti HBC Total' },
  { department: 'MICROBIOLOGY', description: 'Anti HBC IgM' },
  { department: 'MICROBIOLOGY', description: 'Chikungunya Virus Antibody, IgM' },
  { department: 'MICROBIOLOGY', description: 'ASLO' },
  { department: 'MICROBIOLOGY', description: 'Sputum Grams' },
  { department: 'MICROBIOLOGY', description: 'Anti HBsAG' },

  // ───────────────── APLA PROFILE ─────────────────
  { department: 'APLA PROFILE', description: 'Lupus Anticoagulant' },
  { department: 'APLA PROFILE', description: 'Anti Nuclear Antibodies' },
  { department: 'APLA PROFILE', description: 'APLA - IgG' },
  { department: 'APLA PROFILE', description: 'APLA - IgM' },

  // ───────────────── MOLECULAR BIOLOGY ─────────────────
  { department: 'MOLECULAR BIOLOGY', description: 'H1N1 Test' },
  { department: 'MOLECULAR BIOLOGY', description: 'HBV DNA - Quan' },
  { department: 'MOLECULAR BIOLOGY', description: 'HBV DNA - Qual' },
  { department: 'MOLECULAR BIOLOGY', description: 'HCV RNA' },
  { department: 'MOLECULAR BIOLOGY', description: 'HIV Viral Load' },
  { department: 'MOLECULAR BIOLOGY', description: 'TB-PCR' },
  { department: 'MOLECULAR BIOLOGY', description: 'Quantiferon TB Gold' },
  { department: 'MOLECULAR BIOLOGY', description: 'H3N2' },
  { department: 'MOLECULAR BIOLOGY', description: 'RT PCR for COVID' },

  // ───────────────── CARDIAC MARKER ─────────────────
  { department: 'CARDIAC MARKER', description: 'CPK' },
  { department: 'CARDIAC MARKER', description: 'LDH' },
  { department: 'CARDIAC MARKER', description: 'Troponin-I' },
  { department: 'CARDIAC MARKER', description: 'NT Pro BNP' },
  { department: 'CARDIAC MARKER', description: 'Troponin-T' },

  // ───────────────── SEROLOGY ─────────────────
  { department: 'SEROLOGY', description: 'HIV - Rapid' },
  { department: 'SEROLOGY', description: 'HBsAG - Rapid' },
  { department: 'SEROLOGY', description: 'Anti HCV - Rapid' },
  { department: 'SEROLOGY', description: 'HIV - CLIA' },
  { department: 'SEROLOGY', description: 'HBsAG - CLIA' },
  { department: 'SEROLOGY', description: 'Anti HCV - CLIA' },
  { department: 'SEROLOGY', description: 'HIV - P24' },
  { department: 'SEROLOGY', description: 'Dengue - NS1 Antigen' },
  { department: 'SEROLOGY', description: 'Dengue Antibody IgG' },
  { department: 'SEROLOGY', description: 'Dengue Antibody IgM' },
  { department: 'SEROLOGY', description: 'VDRL/RPR Titre' },
  { department: 'SEROLOGY', description: 'Widal - Slide' },
  { department: 'SEROLOGY', description: 'Widal - Tube' },
  { department: 'SEROLOGY', description: 'Typhoid IgG & IgM - Rapid' },
  { department: 'SEROLOGY', description: 'Malaria Parasite - Smear' },
  { department: 'SEROLOGY', description: 'Malaria Parasite - Rapid' },

  // ───────────────── CULTURE & SENSITIVITY ─────────────────
  { department: 'CULTURE & SENSITIVITY', description: 'Blood' },
  { department: 'CULTURE & SENSITIVITY', description: 'Pus' },
  { department: 'CULTURE & SENSITIVITY', description: 'Stool' },
  { department: 'CULTURE & SENSITIVITY', description: 'Throat Swab' },
  { department: 'CULTURE & SENSITIVITY', description: 'Sputum' },
  { department: 'CULTURE & SENSITIVITY', description: 'Urine' },
  { department: 'CULTURE & SENSITIVITY', description: 'Fungal' },
  { department: 'CULTURE & SENSITIVITY', description: 'Vaginal Swab' },
  { department: 'CULTURE & SENSITIVITY', description: 'HAV IgM' },
  { department: 'CULTURE & SENSITIVITY', description: 'CSF Analysis' },
  { department: 'CULTURE & SENSITIVITY', description: 'CSF Culture' },
  { department: 'CULTURE & SENSITIVITY', description: 'RA Factor' },
  { department: 'CULTURE & SENSITIVITY', description: 'Rubella - (IgG & IgM)' },
  { department: 'CULTURE & SENSITIVITY', description: 'Mantoux Test' },
  { department: 'CULTURE & SENSITIVITY', description: 'Pap Smear' },
  { department: 'CULTURE & SENSITIVITY', description: 'Procalcitonin (PCT)' },

  // ───────────────── TUMOUR MARKERS ─────────────────
  { department: 'TUMOUR MARKERS', description: 'Alpha Feto Protein (AFP)' },
  { department: 'TUMOUR MARKERS', description: 'Beta HCG' },
  { department: 'TUMOUR MARKERS', description: 'CA 125' },
  { department: 'TUMOUR MARKERS', description: 'CA 19.9' },
  { department: 'TUMOUR MARKERS', description: 'CEA' },
  { department: 'TUMOUR MARKERS', description: 'PSA' },
];

/**
 * Radiology modalities from the RADIOLOGY REQUEST FORM "INVESTIGATION REQUIRED"
 * row. The specific study (e.g. "X-Ray Chest PA") is typed into Clinical Details
 * on the radiology panel; these are the modality buckets.
 */
export const RADIOLOGY_TEST_SEED: CatalogSeedItem[] = [
  { department: 'RADIOLOGY', description: 'X-Ray' },
  { department: 'RADIOLOGY', description: 'MRI' },
  { department: 'RADIOLOGY', description: 'CT' },
  { department: 'RADIOLOGY', description: 'USG' },
  { department: 'RADIOLOGY', description: 'Mammography' },
  { department: 'RADIOLOGY', description: 'Doppler' },
  { department: 'RADIOLOGY', description: 'BMD' },
  { department: 'RADIOLOGY', description: 'Others' },
];

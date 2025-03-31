from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import uuid
import requests
from gtts import gTTS
import json
import time
from deep_translator import GoogleTranslator
import re

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)  # Enable CORS for all routes

# Dictionary of supported languages with their codes
LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "ja": "Japanese",
    "ko": "Korean"
}

# LibreTranslate API endpoint (free and open source)
LIBRETRANSLATE_URL = "https://libretranslate.de/translate"

# Comprehensive Medical Dictionary
MEDICAL_JARGON = {
    # Cardiovascular
    "hypertension": {
        "definition": "High blood pressure - when the force of blood against your artery walls is too high.",
        "category": "cardiovascular",
        "pronunciation": "hahy-per-TEN-shuhn"
    },
    "myocardial infarction": {
        "definition": "Heart attack - when blood flow to part of the heart is blocked.",
        "category": "cardiovascular",
        "pronunciation": "mahy-oh-KAHR-dee-uhl in-FAHRK-shuhn"
    },
    "cerebrovascular accident": {
        "definition": "Stroke - when blood flow to the brain is interrupted.",
        "category": "cardiovascular",
        "pronunciation": "suh-ree-broh-VAS-kyuh-ler AK-si-duhnt"
    },
    "arrhythmia": {
        "definition": "Irregular heartbeat - when your heart beats too fast, too slow, or irregularly.",
        "category": "cardiovascular",
        "pronunciation": "uh-RITH-mee-uh"
    },
    "tachycardia": {
        "definition": "A condition that makes your heart beat more than 100 times per minute.",
        "category": "cardiovascular",
        "pronunciation": "tak-ih-KAHR-dee-uh"
    },
    "bradycardia": {
        "definition": "A slower than normal heart rate - less than 60 beats per minute.",
        "category": "cardiovascular",
        "pronunciation": "brad-ih-KAHR-dee-uh"
    },
    "angina pectoris": {
        "definition": "Chest pain caused by reduced blood flow to the heart muscle.",
        "category": "cardiovascular",
        "pronunciation": "an-JYE-nuh or AN-juh-nuh PEK-tuh-ris"
    },
    "atherosclerosis": {
        "definition": "Buildup of fats, cholesterol and other substances in and on the artery walls.",
        "category": "cardiovascular",
        "pronunciation": "ath-er-oh-skluh-ROH-sis"
    },
    "atrial fibrillation": {
        "definition": "Irregular and often rapid heart rate that can increase risk of stroke and heart failure.",
        "category": "cardiovascular",
        "pronunciation": "AY-tree-uhl fib-ruh-LAY-shuhn"
    },
    "ventricular fibrillation": {
        "definition": "A life-threatening condition where the heart beats with rapid, erratic electrical impulses.",
        "category": "cardiovascular",
        "pronunciation": "ven-TRIK-yuh-ler fib-ruh-LAY-shuhn"
    },
    "heart failure": {
        "definition": "A chronic condition where the heart doesn't pump blood as well as it should.",
        "category": "cardiovascular",
        "pronunciation": "hart FAYL-yer"
    },
    "aneurysm": {
        "definition": "A bulge in a blood vessel caused by a weakness in the blood vessel wall.",
        "category": "cardiovascular",
        "pronunciation": "AN-yuh-riz-uhm"
    },
    "deep vein thrombosis": {
        "definition": "A blood clot in a deep vein, usually in the legs.",
        "category": "cardiovascular",
        "pronunciation": "deep vayn throm-BOH-sis"
    },
    "peripheral vascular disease": {
        "definition": "A circulation disorder that causes narrowing of blood vessels to limbs.",
        "category": "cardiovascular",
        "pronunciation": "puh-RIF-er-uhl VAS-kyuh-ler dih-ZEEZ"
    },

    # Metabolic
    "hyperlipidemia": {
        "definition": "High cholesterol - elevated levels of fats in your blood.",
        "category": "metabolic",
        "pronunciation": "hahy-per-lip-i-DEE-mee-uh"
    },
    "diabetes mellitus": {
        "definition": "A condition that affects how your body processes blood sugar (glucose).",
        "category": "metabolic",
        "pronunciation": "dahy-uh-BEE-teez muh-LYE-tuhs"
    },
    "hypothyroidism": {
        "definition": "A condition in which your thyroid gland doesn't produce enough thyroid hormone.",
        "category": "metabolic",
        "pronunciation": "hahy-poh-THAHY-roi-diz-uhm"
    },
    "hyperthyroidism": {
        "definition": "A condition in which your thyroid gland produces too much thyroid hormone.",
        "category": "metabolic",
        "pronunciation": "hahy-per-THAHY-roi-diz-uhm"
    },
    "metabolic syndrome": {
        "definition": "A cluster of conditions that occur together, increasing risk of heart disease, stroke and diabetes.",
        "category": "metabolic",
        "pronunciation": "met-uh-BOL-ik SIN-drohm"
    },
    "hyperglycemia": {
        "definition": "High blood sugar - occurs when your body doesn't have enough insulin or can't use insulin properly.",
        "category": "metabolic",
        "pronunciation": "hahy-per-glahy-SEE-mee-uh"
    },
    "hypoglycemia": {
        "definition": "Low blood sugar - occurs when blood sugar decreases to below normal levels.",
        "category": "metabolic",
        "pronunciation": "hahy-poh-glahy-SEE-mee-uh"
    },
    "ketoacidosis": {
        "definition": "A serious complication of diabetes that occurs when your body produces high levels of ketones.",
        "category": "metabolic",
        "pronunciation": "kee-toh-as-i-DOH-sis"
    },
    "gout": {
        "definition": "A form of inflammatory arthritis characterized by recurrent attacks of a red, tender, hot, and swollen joint.",
        "category": "metabolic",
        "pronunciation": "gout"
    },
    "obesity": {
        "definition": "A complex disease involving an excessive amount of body fat that increases risk of other health problems.",
        "category": "metabolic",
        "pronunciation": "oh-BEE-si-tee"
    },

    # Respiratory
    "asthma": {
        "definition": "A condition in which your airways narrow and swell and produce extra mucus.",
        "category": "respiratory",
        "pronunciation": "AZ-muh"
    },
    "copd": {
        "definition": "Chronic Obstructive Pulmonary Disease - a chronic inflammatory lung disease that causes obstructed airflow from the lungs.",
        "category": "respiratory",
        "pronunciation": "C-O-P-D"
    },
    "bronchitis": {
        "definition": "Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs.",
        "category": "respiratory",
        "pronunciation": "brong-KYE-tis"
    },
    "pneumonia": {
        "definition": "Infection that inflames air sacs in one or both lungs.",
        "category": "respiratory",
        "pronunciation": "noo-MOH-nyuh"
    },
    "dyspnea": {
        "definition": "Shortness of breath or difficulty breathing.",
        "category": "respiratory",
        "pronunciation": "DISP-nee-uh"
    },
    "pulmonary embolism": {
        "definition": "A blockage in one of the pulmonary arteries in your lungs, often caused by blood clots.",
        "category": "respiratory",
        "pronunciation": "PUL-muh-nair-ee EM-buh-liz-uhm"
    },
    "tuberculosis": {
        "definition": "An infectious disease that primarily affects the lungs, caused by Mycobacterium tuberculosis.",
        "category": "respiratory",
        "pronunciation": "too-ber-kyuh-LOH-sis"
    },
    "emphysema": {
        "definition": "A lung condition that causes shortness of breath due to damage to the air sacs in the lungs.",
        "category": "respiratory",
        "pronunciation": "em-fuh-SEE-muh"
    },
    "pleural effusion": {
        "definition": "Buildup of fluid between the layers of tissue that line the lungs and chest cavity.",
        "category": "respiratory",
        "pronunciation": "PLOOR-uhl ih-FYOO-zhuhn"
    },
    "sleep apnea": {
        "definition": "A potentially serious sleep disorder in which breathing repeatedly stops and starts.",
        "category": "respiratory",
        "pronunciation": "sleep AP-nee-uh"
    },
    "cystic fibrosis": {
        "definition": "An inherited disorder that causes severe damage to the lungs, digestive system and other organs.",
        "category": "respiratory",
        "pronunciation": "SIS-tik fahy-BROH-sis"
    },

    # Neurological
    "alzheimer's": {
        "definition": "A progressive disease that destroys memory and other important mental functions.",
        "category": "neurological",
        "pronunciation": "ALTS-hahy-merz"
    },
    "parkinson's": {
        "definition": "A disorder of the central nervous system that affects movement.",
        "category": "neurological",
        "pronunciation": "PAHR-kin-suhnz"
    },
    "multiple sclerosis": {
        "definition": "A disease in which the immune system eats away at the protective covering of nerves.",
        "category": "neurological",
        "pronunciation": "MUL-tuh-puhl skluh-ROH-sis"
    },
    "epilepsy": {
        "definition": "A neurological disorder characterized by recurrent seizures.",
        "category": "neurological",
        "pronunciation": "EP-uh-lep-see"
    },
    "syncope": {
        "definition": "Temporary loss of consciousness caused by a fall in blood pressure.",
        "category": "neurological",
        "pronunciation": "SING-kuh-pee"
    },
    "vertigo": {
        "definition": "A sensation of feeling off balance or dizzy.",
        "category": "neurological",
        "pronunciation": "VUR-ti-goh"
    },
    "migraine": {
        "definition": "A headache of varying intensity, often accompanied by nausea and sensitivity to light and sound.",
        "category": "neurological",
        "pronunciation": "MY-grayn"
    },
    "dementia": {
        "definition": "A general term for a decline in mental ability severe enough to interfere with daily life.",
        "category": "neurological",
        "pronunciation": "dih-MEN-shuh"
    },
    "neuropathy": {
        "definition": "Damage or dysfunction of one or more nerves that typically results in numbness, tingling, muscle weakness and pain.",
        "category": "neurological",
        "pronunciation": "noo-ROP-uh-thee"
    },
    "meningitis": {
        "definition": "Inflammation of the membranes (meninges) surrounding your brain and spinal cord.",
        "category": "neurological",
        "pronunciation": "men-in-JYE-tis"
    },
    "encephalitis": {
        "definition": "Inflammation of the brain, most often due to a viral infection.",
        "category": "neurological",
        "pronunciation": "en-sef-uh-LYE-tis"
    },
    "guillain-barré syndrome": {
        "definition": "A rare disorder where the body's immune system attacks the nerves.",
        "category": "neurological",
        "pronunciation": "gee-YAN bah-RAY SIN-drohm"
    },

    # Gastrointestinal
    "gastroesophageal reflux disease": {
        "definition": "GERD - when stomach acid frequently flows back into the tube connecting your mouth and stomach.",
        "category": "gastrointestinal",
        "pronunciation": "gas-troh-ih-sof-uh-JEE-uhl REE-fluks dih-ZEEZ"
    },
    "hepatitis": {
        "definition": "Inflammation of the liver, often caused by a virus.",
        "category": "gastrointestinal",
        "pronunciation": "hep-uh-TYE-tis"
    },
    "cirrhosis": {
        "definition": "Late stage scarring of the liver caused by many forms of liver diseases and conditions.",
        "category": "gastrointestinal",
        "pronunciation": "si-ROH-sis"
    },
    "irritable bowel syndrome": {
        "definition": "A common disorder that affects the large intestine causing cramping, abdominal pain, bloating, gas, diarrhea and constipation.",
        "category": "gastrointestinal",
        "pronunciation": "IR-i-tuh-buhl BOU-uhl SIN-drohm"
    },
    "diverticulitis": {
        "definition": "Inflammation or infection of small pouches called diverticula that develop along the walls of the intestines.",
        "category": "gastrointestinal",
        "pronunciation": "dahy-ver-tik-yuh-LYE-tis"
    },
    "crohn's disease": {
        "definition": "A type of inflammatory bowel disease that causes inflammation of your digestive tract.",
        "category": "gastrointestinal",
        "pronunciation": "krohnz dih-ZEEZ"
    },
    "ulcerative colitis": {
        "definition": "An inflammatory bowel disease that causes long-lasting inflammation and ulcers in your digestive tract.",
        "category": "gastrointestinal",
        "pronunciation": "UL-suh-ruh-tiv kuh-LYE-tis"
    },
    "pancreatitis": {
        "definition": "Inflammation in the pancreas, which can cause severe abdominal pain.",
        "category": "gastrointestinal",
        "pronunciation": "pan-kree-uh-TYE-tis"
    },
    "cholecystitis": {
        "definition": "Inflammation of the gallbladder, often due to gallstones.",
        "category": "gastrointestinal",
        "pronunciation": "koh-luh-sis-TYE-tis"
    },
    "celiac disease": {
        "definition": "An immune reaction to eating gluten, a protein found in wheat, barley, and rye.",
        "category": "gastrointestinal",
        "pronunciation": "SEE-lee-ak dih-ZEEZ"
    },
    "gastritis": {
        "definition": "Inflammation of the lining of the stomach.",
        "category": "gastrointestinal",
        "pronunciation": "gas-TRY-tis"
    },
    "peptic ulcer": {
        "definition": "An open sore that develops on the inside lining of your stomach and the upper portion of your small intestine.",
        "category": "gastrointestinal",
        "pronunciation": "PEP-tik UL-ser"
    },

    # Renal
    "renal failure": {
        "definition": "Kidney failure - when your kidneys lose the ability to filter waste from your blood sufficiently.",
        "category": "renal",
        "pronunciation": "REE-nuhl FEYL-yer"
    },
    "nephropathy": {
        "definition": "Disease or damage of the kidney, which can lead to kidney failure.",
        "category": "renal",
        "pronunciation": "nuh-FROP-uh-thee"
    },
    "dialysis": {
        "definition": "A procedure to remove waste products and excess fluid from the blood when the kidneys stop working properly.",
        "category": "renal",
        "pronunciation": "dahy-AL-uh-sis"
    },
    "nephrolithiasis": {
        "definition": "Kidney stones - hard deposits made of minerals and salts that form inside your kidneys.",
        "category": "renal",
        "pronunciation": "nef-roh-li-THYE-uh-sis"
    },
    "glomerulonephritis": {
        "definition": "Inflammation of the tiny filters in your kidneys (glomeruli).",
        "category": "renal",
        "pronunciation": "gloh-mer-yuh-loh-nuh-FRY-tis"
    },
    "polycystic kidney disease": {
        "definition": "An inherited disorder in which clusters of cysts develop primarily within your kidneys.",
        "category": "renal",
        "pronunciation": "pol-ee-SIS-tik KID-nee dih-ZEEZ"
    },
    "hydronephrosis": {
        "definition": "Swelling of a kidney due to a build-up of urine, often caused by an obstruction.",
        "category": "renal",
        "pronunciation": "hahy-droh-nuh-FROH-sis"
    },
    "pyelonephritis": {
        "definition": "A type of urinary tract infection that affects one or both kidneys.",
        "category": "renal",
        "pronunciation": "pahy-uh-loh-nuh-FRY-tis"
    },

    # Hematological
    "anemia": {
        "definition": "A condition in which you lack enough healthy red blood cells to carry adequate oxygen to your body's tissues.",
        "category": "hematological",
        "pronunciation": "uh-NEE-mee-uh"
    },
    "leukemia": {
        "definition": "Cancer of the body's blood-forming tissues, including the bone marrow and the lymphatic system.",
        "category": "hematological",
        "pronunciation": "loo-KEE-mee-uh"
    },
    "thrombocytopenia": {
        "definition": "A condition in which you have a low blood platelet count, affecting blood clotting.",
        "category": "hematological",
        "pronunciation": "throm-boh-sahy-tuh-PEE-nee-uh"
    },
    "hemophilia": {
        "definition": "A rare disorder in which your blood doesn't clot normally because it lacks sufficient blood-clotting proteins.",
        "category": "hematological",
        "pronunciation": "hee-muh-FIL-ee-uh"
    },
    "lymphoma": {
        "definition": "A cancer of the lymphatic system, which is part of the body's germ-fighting network.",
        "category": "hematological",
        "pronunciation": "lim-FOH-muh"
    },
    "multiple myeloma": {
        "definition": "A cancer that forms in a type of white blood cell called a plasma cell.",
        "category": "hematological",
        "pronunciation": "MUL-tuh-puhl mahy-uh-LOH-muh"
    },
    "polycythemia": {
        "definition": "A condition in which there are too many red blood cells in the blood circulation.",
        "category": "hematological",
        "pronunciation": "pol-ee-sahy-THEE-mee-uh"
    },
    "sickle cell anemia": {
        "definition": "An inherited red blood cell disorder in which there aren't enough healthy red blood cells to carry oxygen throughout your body.",
        "category": "hematological",
        "pronunciation": "SIK-uhl sel uh-NEE-mee-uh"
    },
    "thalassemia": {
        "definition": "An inherited blood disorder characterized by less hemoglobin and fewer red blood cells than normal.",
        "category": "hematological",
        "pronunciation": "thal-uh-SEE-mee-uh"
    },

    # Oncology
    "oncology": {
        "definition": "The study and treatment of cancer.",
        "category": "oncology",
        "pronunciation": "ong-KOL-uh-jee"
    },
    "metastasis": {
        "definition": "The spread of cancer cells from the place where they first formed to another part of the body.",
        "category": "oncology",
        "pronunciation": "muh-TAS-tuh-sis"
    },
    "benign": {
        "definition": "Not cancerous. Benign tumors may grow but do not spread to other parts of the body.",
        "category": "oncology",
        "pronunciation": "bih-NAHYN"
    },
    "malignant": {
        "definition": "Cancerous. Malignant tumors can invade nearby tissue and spread to other parts of the body.",
        "category": "oncology",
        "pronunciation": "muh-LIG-nuhnt"
    },
    "carcinoma": {
        "definition": "A type of cancer that starts in cells that make up the skin or the tissue lining organs.",
        "category": "oncology",
        "pronunciation": "kahr-suh-NOH-muh"
    },
    "sarcoma": {
        "definition": "A type of cancer that begins in the bones and in the soft tissues of the body.",
        "category": "oncology",
        "pronunciation": "sahr-KOH-muh"
    },
    "lymphoma": {
        "definition": "A cancer of the lymphatic system, which is part of the body's germ-fighting network.",
        "category": "oncology",
        "pronunciation": "lim-FOH-muh"
    },
    "melanoma": {
        "definition": "The most serious type of skin cancer, developing in the cells that produce melanin.",
        "category": "oncology",
        "pronunciation": "mel-uh-NOH-muh"
    },
    "chemotherapy": {
        "definition": "A drug treatment that uses powerful chemicals to kill fast-growing cells in your body.",
        "category": "oncology",
        "pronunciation": "kee-moh-THER-uh-pee"
    },
    "radiation therapy": {
        "definition": "A cancer treatment that uses high doses of radiation to kill cancer cells and shrink tumors.",
        "category": "oncology",
        "pronunciation": "ray-dee-AY-shuhn THER-uh-pee"
    },
    "immunotherapy": {
        "definition": "A treatment that helps your immune system fight cancer.",
        "category": "oncology",
        "pronunciation": "im-yuh-noh-THER-uh-pee"
    },
    "biopsy": {
        "definition": "A procedure to remove a piece of tissue or a sample of cells from your body to analyze it in a laboratory.",
        "category": "oncology",
        "pronunciation": "BYE-op-see"
    },

    # Orthopedic
    "osteoarthritis": {
        "definition": "The most common form of arthritis, caused by wear and tear on a joint.",
        "category": "orthopedic",
        "pronunciation": "os-tee-oh-ahr-THRY-tis"
    },
    "rheumatoid arthritis": {
        "definition": "An autoimmune disorder that causes inflammation of the joints and surrounding tissues.",
        "category": "orthopedic",
        "pronunciation": "ROO-muh-toid ahr-THRY-tis"
    },
    "osteoporosis": {
        "definition": "A condition that causes bones to become weak and brittle.",
        "category": "orthopedic",
        "pronunciation": "os-tee-oh-puh-ROH-sis"
    },
    "fracture": {
        "definition": "A break in a bone.",
        "category": "orthopedic",
        "pronunciation": "FRAK-cher"
    },
    "sprain": {
        "definition": "A stretching or tearing of ligaments — the tough bands of fibrous tissue that connect two bones together in your joints.",
        "category": "orthopedic",
        "pronunciation": "sprayn"
    },
    "tendinitis": {
        "definition": "Inflammation or irritation of a tendon — the thick fibrous cords that attach muscle to bone.",
        "category": "orthopedic",
        "pronunciation": "ten-duh-NYE-tis"
    },
    "bursitis": {
        "definition": "Inflammation of the fluid-filled pads (bursae) that act as cushions at the joints.",
        "category": "orthopedic",
        "pronunciation": "bur-SYE-tis"
    },
    "scoliosis": {
        "definition": "A sideways curvature of the spine that most often is diagnosed in adolescents.",
        "category": "orthopedic",
        "pronunciation": "skoh-lee-OH-sis"
    },
    "herniated disk": {
        "definition": "A problem with one of the rubbery cushions (disks) between the individual bones (vertebrae) that stack up to make your spine.",
        "category": "orthopedic",
        "pronunciation": "HUR-nee-ay-ted disk"
    },

    # Dermatological
    "dermatitis": {
        "definition": "A general term that describes skin inflammation.",
        "category": "dermatological",
        "pronunciation": "dur-muh-TYE-tis"
    },
    "eczema": {
        "definition": "A condition that makes your skin red and itchy.",
        "category": "dermatological",
        "pronunciation": "EG-zuh-muh"
    },
    "psoriasis": {
        "definition": "A skin disease that causes red, itchy scaly patches, most commonly on the knees, elbows, trunk and scalp.",
        "category": "dermatological",
        "pronunciation": "suh-RYE-uh-sis"
    },
    "acne": {
        "definition": "A skin condition that occurs when your hair follicles become plugged with oil and dead skin cells.",
        "category": "dermatological",
        "pronunciation": "AK-nee"
    },
    "rosacea": {
        "definition": "A common skin condition that causes redness and visible blood vessels in your face.",
        "category": "dermatological",
        "pronunciation": "roh-ZAY-shuh"
    },
    "vitiligo": {
        "definition": "A disease that causes the loss of skin color in blotches.",
        "category": "dermatological",
        "pronunciation": "vit-il-EYE-go"
    },
    "cellulitis": {
        "definition": "A common, potentially serious bacterial skin infection.",
        "category": "dermatological",
        "pronunciation": "sel-yuh-LYE-tis"
    },
    "urticaria": {
        "definition": "Hives - a skin reaction that causes itchy welts, which may be triggered by certain foods, medications or other allergens.",
        "category": "dermatological",
        "pronunciation": "ur-ti-KAIR-ee-uh"
    },

    # Endocrine
    "diabetes": {
        "definition": "A disease that occurs when your blood glucose is too high.",
        "category": "endocrine",
        "pronunciation": "dahy-uh-BEE-teez"
    },
    "hyperthyroidism": {
        "definition": "A condition in which the thyroid gland produces too much thyroid hormone.",
        "category": "endocrine",
        "pronunciation": "hahy-per-THAHY-roi-diz-uhm"
    },
    "hypothyroidism": {
        "definition": "A condition in which the thyroid gland doesn't produce enough thyroid hormone.",
        "category": "endocrine",
        "pronunciation": "hahy-poh-THAHY-roi-diz-uhm"
    },
    "cushing's syndrome": {
        "definition": "A condition that occurs when your body is exposed to high levels of the hormone cortisol for a long time.",
        "category": "endocrine",
        "pronunciation": "KOOSH-ingz SIN-drohm"
    },
    "addison's disease": {
        "definition": "A disorder that occurs when your body produces insufficient amounts of certain hormones produced by your adrenal glands.",
        "category": "endocrine",
        "pronunciation": "AD-i-suhnz dih-ZEEZ"
    },
    "acromegaly": {
        "definition": "A hormonal disorder that develops when your pituitary gland produces too much growth hormone during adulthood.",
        "category": "endocrine",
        "pronunciation": "ak-ruh-MEG-uh-lee"
    },
    "gigantism": {
        "definition": "A rare condition that causes abnormal growth in children, leading to excessive height and very large body parts.",
        "category": "endocrine",
        "pronunciation": "JYE-gan-tiz-uhm"
    },

    # Infectious Diseases
    "influenza": {
        "definition": "A contagious respiratory illness caused by influenza viruses.",
        "category": "infectious",
        "pronunciation": "in-floo-EN-zuh"
    },
    "pneumonia": {
        "definition": "An infection that inflames the air sacs in one or both lungs, which may fill with fluid.",
        "category": "infectious",
        "pronunciation": "noo-MOH-nyuh"
    },
    "tuberculosis": {
        "definition": "A potentially serious infectious disease that mainly affects your lungs.",
        "category": "infectious",
        "pronunciation": "too-ber-kyuh-LOH-sis"
    },
    "hiv": {
        "definition": "Human Immunodeficiency Virus - a virus that attacks the body's immune system.",
        "category": "infectious",
        "pronunciation": "H-I-V"
    },
    "aids": {
        "definition": "Acquired Immunodeficiency Syndrome - a chronic, potentially life-threatening condition caused by HIV.",
        "category": "infectious",
        "pronunciation": "aydz"
    },
    "hepatitis": {
        "definition": "Inflammation of the liver, commonly caused by a viral infection.",
        "category": "infectious",
        "pronunciation": "hep-uh-TYE-tis"
    },
    "meningitis": {
        "definition": "Inflammation of the membranes (meninges) surrounding your brain and spinal cord.",
        "category": "infectious",
        "pronunciation": "men-in-JYE-tis"
    },
    "sepsis": {
        "definition": "A potentially life-threatening condition caused by the body's response to an infection.",
        "category": "infectious",
        "pronunciation": "SEP-sis"
    },
    "malaria": {
        "definition": "A disease caused by a parasite that is transmitted to humans through the bites of infected mosquitoes.",
        "category": "infectious",
        "pronunciation": "muh-LAIR-ee-uh"
    },

    # General Medical Terms
    "prognosis": {
        "definition": "The likely outcome or course of a disease; the chance of recovery or recurrence.",
        "category": "general",
        "pronunciation": "prog-NOH-sis"
    },
    "remission": {
        "definition": "A decrease in or disappearance of signs and symptoms of cancer.",
        "category": "general",
        "pronunciation": "ri-MISH-uhn"
    },
    "biopsy": {
        "definition": "The removal of cells or tissues for examination under a microscope.",
        "category": "general",
        "pronunciation": "BYE-op-see"
    },
    "edema": {
        "definition": "Swelling caused by excess fluid trapped in your body's tissues.",
        "category": "general",
        "pronunciation": "ih-DEE-muh"
    },
    "embolism": {
        "definition": "A blockage in one of your blood vessels, caused by a foreign object like a blood clot or an air bubble.",
        "category": "general",
        "pronunciation": "EM-buh-liz-uhm"
    },
    "ischemia": {
        "definition": "A restriction in blood supply to tissues, causing a shortage of oxygen needed for cellular metabolism.",
        "category": "general",
        "pronunciation": "ih-SKEE-mee-uh"
    },
    "nausea": {
        "definition": "A feeling of sickness with an inclination to vomit.",
        "category": "general",
        "pronunciation": "NAW-zee-uh"
    },
    "pyrexia": {
        "definition": "Fever - an abnormally high body temperature, usually a sign of illness.",
        "category": "general",
        "pronunciation": "pahy-REK-see-uh"
    },
    "acute": {
        "definition": "Sudden onset, usually severe but with a short course.",
        "category": "general",
        "pronunciation": "uh-KYOOT"
    },
    "chronic": {
        "definition": "Persisting for a long time or constantly recurring.",
        "category": "general",
        "pronunciation": "KRON-ik"
    },
    "idiopathic": {
        "definition": "Relating to or denoting any disease or condition that arises spontaneously or for which the cause is unknown.",
        "category": "general",
        "pronunciation": "id-ee-oh-PATH-ik"
    },
    "iatrogenic": {
        "definition": "Relating to illness caused by medical examination or treatment.",
        "category": "general",
        "pronunciation": "eye-at-roh-JEN-ik"
    },
    "comorbidity": {
        "definition": "The simultaneous presence of two or more diseases or medical conditions in a patient.",
        "category": "general",
        "pronunciation": "koh-mor-BID-i-tee"
    },
    "etiology": {
        "definition": "The cause, set of causes, or manner of causation of a disease or condition.",
        "category": "general",
        "pronunciation": "ee-tee-OL-uh-jee"
    },
    "prodromal": {
        "definition": "Relating to or denoting the period between the appearance of initial symptoms and the full development of a disease.",
        "category": "general",
        "pronunciation": "proh-DROH-muhl"
    },
    "prophylaxis": {
        "definition": "Action taken to prevent disease, especially by specified means or against a specified disease.",
        "category": "general",
        "pronunciation": "proh-fuh-LAK-sis"
    },
    "sequela": {
        "definition": "A condition that is the consequence of a previous disease or injury.",
        "category": "general",
        "pronunciation": "si-KWEL-uh"
    }
}

# Voice assistant commands and responses
VOICE_COMMANDS = {
    "translate": {
        "patterns": ["translate", "start translation", "begin translation", "record", "start recording"],
        "response": "Starting translation recording."
    },
    "stop": {
        "patterns": ["stop", "stop recording", "end recording", "finish", "done"],
        "response": "Stopping recording."
    },
    "play": {
        "patterns": ["play", "speak", "read", "play audio", "play translation"],
        "response": "Playing audio translation."
    },
    "switch_speaker": {
        "patterns": ["switch speaker", "change speaker", "switch role", "change role"],
        "response": "Switching between provider and patient."
    },
    "switch_language": {
        "patterns": ["switch language", "change language", "swap language"],
        "response": "Switching languages."
    },
    "clear": {
        "patterns": ["clear", "clear history", "delete history", "reset"],
        "response": "Clearing conversation history."
    },
    "help": {
        "patterns": ["help", "what can you do", "commands", "voice commands", "assistance"],
        "response": "Available commands: translate, stop, play, switch speaker, switch language, clear, help."
    },
    "translate_jargon": {
        "patterns": ["translate jargon", "translate terms", "translate medical terms", "explain in other language"],
        "response": "Translating medical jargon to selected language."
    },
    "search_term": {
        "patterns": ["search term", "find term", "look up", "search for", "find medical term"],
        "response": "Searching for medical term."
    },
    "continuous_mode": {
        "patterns": ["continuous mode", "toggle continuous", "start continuous", "stop continuous"],
        "response": "Toggling continuous listening mode."
    },
    "filter_category": {
        "patterns": ["filter category", "show category", "filter terms", "show terms by"],
        "response": "Filtering medical terms by category."
    }
}


@app.route('/')
def index():
    return render_template('index.html', languages=LANGUAGES, app_name="MedLingo")


@app.route('/translate', methods=['POST'])
def translate_text():
    """Translate text using LibreTranslate API with fallback to deep_translator"""
    data = request.json
    text = data.get('text')
    source_lang = data.get('source_lang')
    target_lang = data.get('target_lang')

    if not all([text, target_lang]):
        return jsonify({"error": "Missing required parameters"}), 400

    # First try with LibreTranslate
    try:
        # Prepare the request to LibreTranslate
        payload = {
            "q": text,
            "source": source_lang if source_lang != 'auto' else 'auto',
            "target": target_lang,
            "format": "text"
        }

        headers = {
            "Content-Type": "application/json"
        }

        # Make the request to LibreTranslate with a timeout
        response = requests.post(LIBRETRANSLATE_URL, json=payload, headers=headers, timeout=5)

        if response.status_code == 200:
            result = response.json()
            translated_text = result.get("translatedText", "")

            # Find medical jargon in the original text
            medical_terms = find_medical_terms(text)

            return jsonify({
                "original_text": text,
                "translated_text": translated_text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "service": "LibreTranslate",
                "medical_terms": medical_terms
            })
    except Exception as e:
        print(f"LibreTranslate error: {str(e)}")
        # Continue to fallback

    # Fallback to deep_translator (Google Translate)
    try:
        print("Falling back to deep_translator...")

        # Handle 'auto' source language
        if source_lang == 'auto':
            source_lang = 'auto'

        # Use deep_translator's GoogleTranslator
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated_text = translator.translate(text)

        # Find medical jargon in the original text
        medical_terms = find_medical_terms(text)

        return jsonify({
            "original_text": text,
            "translated_text": translated_text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "service": "GoogleTranslator (fallback)",
            "medical_terms": medical_terms
        })
    except Exception as e:
        print(f"Fallback translation error: {str(e)}")
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500


def find_medical_terms(text):
    """Find medical jargon in text and return simplified explanations with additional metadata"""
    found_terms = {}

    # Convert text to lowercase for case-insensitive matching
    text_lower = text.lower()

    # Check for each medical term in the text
    for term, info in MEDICAL_JARGON.items():
        # Use word boundary to match whole words only
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, text_lower):
            found_terms[term] = info

    return found_terms


@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using gTTS"""
    data = request.json
    text = data.get('text')
    lang = data.get('lang')

    if not all([text, lang]):
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        # Create audio directory if it doesn't exist
        audio_dir = os.path.join('static', 'audio')
        os.makedirs(audio_dir, exist_ok=True)

        # Generate a unique filename
        filename = f"speech_{uuid.uuid4()}.mp3"
        filepath = os.path.join(audio_dir, filename)

        # Generate speech using gTTS
        tts = gTTS(text=text, lang=lang.split('-')[0])  # gTTS uses primary language code
        tts.save(filepath)

        return jsonify({
            "audio_url": f"/static/audio/{filename}"
        })
    except Exception as e:
        print(f"Text-to-speech error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/simplify-medical-terms', methods=['POST'])
def simplify_medical_terms():
    """Simplify medical terms in the provided text"""
    data = request.json
    text = data.get('text')

    if not text:
        return jsonify({"error": "Missing required text parameter"}), 400

    try:
        medical_terms = find_medical_terms(text)
        return jsonify({
            "original_text": text,
            "medical_terms": medical_terms
        })
    except Exception as e:
        print(f"Medical term simplification error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/translate-medical-term', methods=['POST'])
def translate_medical_term():
    """Translate a medical term and its definition to the target language"""
    data = request.json
    term = data.get('term')
    definition = data.get('definition')
    target_lang = data.get('target_lang')

    if not all([term, definition, target_lang]):
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        # Translate the term
        translator = GoogleTranslator(source='en', target=target_lang)
        translated_term = translator.translate(term)

        # Translate the definition
        translated_definition = translator.translate(definition)

        return jsonify({
            "original_term": term,
            "original_definition": definition,
            "translated_term": translated_term,
            "translated_definition": translated_definition,
            "target_lang": target_lang
        })
    except Exception as e:
        print(f"Medical term translation error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/search-medical-term', methods=['POST'])
def search_medical_term():
    """Search for a specific medical term"""
    data = request.json
    term = data.get('term', '').lower()

    if not term:
        return jsonify({"error": "Missing required term parameter"}), 400

    try:
        results = {}
        for medical_term, info in MEDICAL_JARGON.items():
            if term in medical_term.lower():
                results[medical_term] = info

        return jsonify({
            "search_term": term,
            "results": results
        })
    except Exception as e:
        print(f"Medical term search error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/get-medical-categories', methods=['GET'])
def get_medical_categories():
    """Get all medical term categories"""
    try:
        categories = set()
        for term_info in MEDICAL_JARGON.values():
            categories.add(term_info.get('category', 'general'))

        return jsonify({
            "categories": sorted(list(categories))
        })
    except Exception as e:
        print(f"Get categories error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/get-terms-by-category', methods=['POST'])
def get_terms_by_category():
    """Get medical terms by category"""
    data = request.json
    category = data.get('category')

    if not category:
        return jsonify({"error": "Missing required category parameter"}), 400

    try:
        results = {}
        for term, info in MEDICAL_JARGON.items():
            if info.get('category') == category:
                results[term] = info

        return jsonify({
            "category": category,
            "terms": results
        })
    except Exception as e:
        print(f"Get terms by category error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/process-voice-command', methods=['POST'])
def process_voice_command():
    """Process voice commands and return appropriate actions"""
    data = request.json
    command_text = data.get('command', '').lower()

    if not command_text:
        return jsonify({"error": "Missing required command parameter"}), 400

    try:
        # Find matching command
        matched_command = None
        for cmd, cmd_info in VOICE_COMMANDS.items():
            for pattern in cmd_info['patterns']:
                if pattern in command_text:
                    matched_command = cmd
                    break
            if matched_command:
                break

        if matched_command:
            return jsonify({
                "command": matched_command,
                "response": VOICE_COMMANDS[matched_command]['response'],
                "success": True
            })
        else:
            return jsonify({
                "command": "unknown",
                "response": "Sorry, I didn't understand that command. Try saying 'help' for a list of commands.",
                "success": False
            })
    except Exception as e:
        print(f"Voice command processing error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "app_name": "MedLingo",
        "services": {
            "translation": ["LibreTranslate", "GoogleTranslator (fallback)"],
            "tts": "gTTS",
            "medical_jargon": "Available",
            "voice_assistant": "Active"
        },
        "medical_terms_count": len(MEDICAL_JARGON),
        "voice_commands_count": len(VOICE_COMMANDS)
    }), 200


@app.route('/supported-languages', methods=['GET'])
def supported_languages():
    """Return supported languages"""
    return jsonify(LANGUAGES), 200


@app.route('/static/<path:path>')
def serve_static(path):
    """Explicitly serve static files"""
    return send_from_directory('static', path)


@app.route('/css-check')
def css_check():
    """Test endpoint to verify CSS is accessible"""
    return jsonify({"status": "CSS endpoint reached successfully"})


if __name__ == '__main__':
    # Create necessary directories
    os.makedirs(os.path.join('static', 'audio'), exist_ok=True)

    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 5000))

    print(f"MedLingo Medical Translation API is running at http://127.0.0.1:{port}")
    print("Healthcare should have no language barriers - speak, understand, connect!")
    print("Note: For local development, you can safely ignore any browser warnings about insecure connections.")

    # Run the app with localhost instead of 0.0.0.0 to reduce security warnings
    app.run(host='127.0.0.1', port=port, debug=True)

print("MedLingo Medical Translation API is running!")
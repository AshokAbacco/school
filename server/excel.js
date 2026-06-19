import XLSX from 'xlsx';

const headers = [
    'First Name', 'Last Name', 'DOB', 'Gender', 'Email', 'Password', 'Phone', 'Address', 'City', 'State', 'ZIP', 
    'Aadhaar', 'PAN Number', 'SATS Number', 'Nationality', 'Religion', 'Caste Category', 'Mother Tongue', 'Subcaste', 
    'Domicile State', 'Annual Income', 'Physically Challenged', 'Disability Type', 'Admission No', 'Class Section', 
    'Academic Year', 'Roll No', 'External ID', 'Admission Date', 'Status', 'Previous School', 'Previous Board', 
    'UDISE Code', 'Lateral Entry', 'Parent Name', 'Parent Phone', 'Parent Email', 'Parent Password', 'Parent Occupation', 
    'Parent Relation', 'Emergency Contact', 'Blood Group', 'Height CM', 'Weight KG', 'Identifying Marks', 'Medical Conditions', 'Allergies'
];

const data = [];

const boys = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Aryan", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Atharv", "Advik", "Pranav", "Advait", "Dhruv", "Kabir", "Ritvik", "Aarush", "Kian", "Darsh"];
const girls = ["Aadhya", "Aanya", "Pari", "Aahana", "Myra", "Sara", "Diya", "Riya", "Navya", "Kiara", "Anvi", "Aarohi", "Prisha", "Mahika", "Saanvi", "Avni", "Nisha", "Trisha", "Veda", "Lyra"];
const surnames = ["Sharma", "Verma", "Patel", "Gupta", "Reddy", "Nair", "Joshi", "Iyer", "Rao", "Mehta", "Shah", "Pillai", "Bose", "Das", "Mishra", "Tiwari", "Sinha", "Pandey", "Kulkarni", "Hegde"];

const religions = ["Hindu", "Muslim", "Christian", "Sikh"];
const castes = ["General", "OBC", "SC", "ST"];
const tongues = ["Hindi", "Kannada", "Telugu", "Tamil", "Marathi", "Bengali", "Malayalam", "Gujarati"];
const bloods = ["A+", "O+", "B+", "AB+", "A-", "O-"];
const jobs = ["Businessperson", "Engineer", "Teacher", "Doctor", "Banker", "Government Employee"];
const schools = ["", "", "", ""];  // LKG kids have no previous school
const boards = ["", "", "", ""];   // LKG kids have no previous board

for (let i = 1; i <= 20; i++) {
    const gender = i % 2 === 0 ? 'Male' : 'Female';
    const firstName = gender === 'Male' ? boys[i - 1] : girls[i - 1];
    const lastName = surnames[i - 1];
    const parentFirst = ["Rakesh", "Sunil", "Amit", "Vijay", "Rahul", "Sanjay", "Manoj", "Deepak", "Anil", "Ravi",
                         "Suresh", "Mahesh", "Naresh", "Ramesh", "Ganesh", "Dinesh", "Lokesh", "Mukesh", "Nilesh", "Yogesh"][i - 1];

    const mockAadhaar = Number(`7766554433${String(i).padStart(2, '0')}`);
    const mockSATS = Number(`7766554${String(i).padStart(2, '0')}`);
    const mockPAN = `LKGAB${Math.floor(3000 + (i * 25))}P`;

    const studentRow = [
        firstName,
        lastName,
        `${String(1 + (i % 27)).padStart(2, '0')}-${String(1 + (i % 11)).padStart(2, '0')}-2021`,  // DOB ~4-5 yrs old
        gender,
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}_lkg_${i}@school.com`,
        `LKG_Pass_${i}`,
        `96601234${String(i).padStart(2, '0')}`,
        `Flat ${10 + i}, Sunshine Apartments, Indiranagar`,
        'Bengaluru',
        'Karnataka',
        560038,
        mockAadhaar,
        mockPAN,
        mockSATS,
        'Indian',
        religions[i % religions.length],
        castes[i % castes.length],
        tongues[i % tongues.length],
        'General Subcaste',
        'Karnataka',
        700000,
        'No',
        '',
        `ADM25_LKG_${String(i).padStart(3, '0')}`,
        'LKG',
        '2025-26',
        i,
        `EXT_25_LKG_${String(i).padStart(2, '0')}`,
        '01-06-2025',
        'ACTIVE',
        '',           // No previous school for LKG
        '',           // No previous board for LKG
        29140100422,
        'No',
        `${parentFirst} ${lastName}`,
        `96601235${String(i).padStart(2, '0')}`,
        `${parentFirst.toLowerCase()}.${lastName.toLowerCase()}_plkg@gmail.com`,
        `ParentLKG_${i}`,
        jobs[i % jobs.length],
        'FATHER',
        `96601235${String(i).padStart(2, '0')}`,
        bloods[i % bloods.length],
        95 + (i % 10),    // Height: 95–104 cm (LKG age appropriate)
        14 + (i % 6),     // Weight: 14–19 kg (LKG age appropriate)
        'Small mole on cheek',
        '', ''
    ];
    data.push(studentRow);
}

const worksheetData = [headers, ...data];
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
XLSX.writeFile(workbook, 'student_bulk_import_LKG.xlsx');

console.log("🚀 Success! 'student_bulk_import_LKG.xlsx' written for LKG class with fresh student data.");
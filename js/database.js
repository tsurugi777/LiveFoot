// Banco de Dados
let db = {
    "countries": [],
    "competitions": [],
    "teams": []
};

const nationalityToFlag = { 
    "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Uruguay": "🇺🇾", "Colombia": "🇨🇴", 
    "Paraguay": "🇵🇾", "Chile": "🇨🇱", "Ecuador": "🇪🇨", "Peru": "🇵🇪", 
    "Venezuela": "🇻🇪", "Bolivia": "🇧🇴", "Portugal": "🇵🇹", "Spain": "🇪🇸", 
    "Italy": "🇮🇹", "France": "🇫🇷", "Germany": "🇩🇪", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", 
    "Netherlands": "🇳🇱", "Belgium": "🇳🇱", "Croatia": "🇭🇷", "Denmark": "🇩🇰", 
    "Sweden": "🇸🇪", "Norway": "🇳🇴", "USA": "🇺🇸", "Mexico": "🇲🇽", 
    "Cameroon": "🇨🇲", "Ghana": "🇬🇭", "Nigeria": "🇳🇬", "Senegal": "🇸🇳", 
    "South Korea": "🇰🇷", "Japan": "🇯🇵", "Morocco": "🇲🇦", "Angola": "🇦🇴", 
    "Cape Verde": "🇨🇻", "DR Congo": "🇨🇩", "Panama": "🇵🇦", "Costa Rica": "🇨🇷", 
    "Honduras": "🇭🇷", "Jamaica": "🇯🇲", "Canada": "🇨🇦", "Australia": "🇨🇦" 
};

// Nomes de jovens da base por país - com nome e sobrenome
const youthFirstNamesByCountry = {
    "Brazil": ["João", "Pedro", "Lucas", "Gabriel", "Rafael", "Matheus", "Felipe", "Bruno", "Anderson", "Thiago", "Rodrigo", "Diego", "Paulo", "Marcelo", "Renato", "Carlos", "Roberto", "Ricardo", "Fernando", "Eduardo"],
    "Argentina": ["Lucas", "Mateo", "Facundo", "Santiago", "Joaquín", "Tomás", "Benjamín", "Nicolás", "Matías", "Franco", "Ignacio", "Federico", "Gonzalo", "Leandro", "Hernán", "Diego", "Pablo", "Martín", "Agustín", "Lautaro"],
    "Portugal": ["João", "Tiago", "André", "Miguel", "Rui", "Nuno", "Bruno", "Daniel", "David", "Tomás", "Diogo", "Afonso", "Gonçalo", "Ricardo", "Pedro", "José", "António", "Manuel", "Francisco", "Carlos"],
    "Spain": ["Carlos", "Antonio", "Manuel", "Francisco", "David", "Alejandro", "Javier", "Alberto", "Sergio", "Rubén", "Eduardo", "Jorge", "Raúl", "Iván", "Fernando", "Diego", "Pablo", "Miguel", "Ángel", "José"],
    "Italy": ["Marco", "Alessandro", "Matteo", "Luca", "Giuseppe", "Antonio", "Francesco", "Paolo", "Simone", "Federico", "Andrea", "Roberto", "Daniele", "Stefano", "Enzo", "Mario", "Luigi", "Giovanni", "Franco", "Alberto"],
    "France": ["Lucas", "Thomas", "Raphaël", "Hugo", "Antoine", "Pierre", "Louis", "Maxime", "Julien", "Baptiste", "Alexandre", "Nicolas", "Yann", "Théo", "Quentin", "Mathis", "Ethan", "Lenny", "Gabriel", "Jules"],
    "Germany": ["Lukas", "Maximilian", "Felix", "Alexander", "Niklas", "Timo", "Lennart", "Mats", "Julian", "Marvin", "Tobias", "Philipp", "Leon", "Mika", "Erik", "Noah", "Ben", "Elias", "Luis", "Emil"],
    "England": ["James", "Harry", "Thomas", "George", "William", "Jack", "Daniel", "Matthew", "Joseph", "Andrew", "Joshua", "Benjamin", "Samuel", "John", "Edward", "Charles", "Henry", "Richard", "Robert", "Michael"],
    "Netherlands": ["Luuk", "Matthijs", "Steven", "Davy", "Donny", "Frenkie", "Kasper", "Joël", "Gini", "Daley", "Memphis", "Georginio", "Teun", "Cody", "Brian", "Denzel", "Donyell", "Ryan", "Justin", "Calvin"],
    "Mexico": ["Carlos", "Javier", "Miguel", "Luis", "Jorge", "Roberto", "Alejandro", "Manuel", "Andrés", "Enrique", "Omar", "Arturo", "Jesús", "Diego", "Hugo", "Raúl", "Iván", "Mario", "Adrián", "Sergio"],
    "Colombia": ["Juan", "David", "Carlos", "Luis", "Jhon", "Andrés", "Santiago", "Mateo", "Daniel", "Miguel", "Julián", "Felipe", "Sebastián", "Alejandro", "Jorge", "Cristian", "Johan", "Yeferson", "Mauricio", "Nicolás"],
    "Uruguay": ["Matías", "Lucas", "Federico", "Nicolás", "Martín", "Gonzalo", "Sebastián", "Rodrigo", "Pablo", "Diego", "Joaquín", "Agustín", "Franco", "Lautaro", "Tomás", "Gastón", "Bruno", "Facundo", "Julián", "Manuel"]
};

const youthLastNamesByCountry = {
    "Brazil": ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Mendes", "Nunes", "Rocha", "Barbosa", "Castro", "Ramos"],
    "Argentina": ["García", "Martínez", "González", "López", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres", "Rivera", "Morales", "Ortiz", "Cruz", "Reyes", "Gutiérrez", "Fernández", "Castro", "Acosta", "Silva", "Romero"],
    "Portugal": ["Silva", "Santos", "Oliveira", "Sousa", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Mendes", "Nunes", "Rocha", "Barbosa", "Castro", "Ramos"],
    "Spain": ["García", "Martínez", "González", "López", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres", "Rivera", "Morales", "Ortiz", "Cruz", "Reyes", "Gutiérrez", "Fernández", "Castro", "Acosta", "Silva", "Romero"],
    "Italy": ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri"],
    "France": ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier"],
    "Germany": ["Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun"],
    "England": ["Smith", "Jones", "Williams", "Taylor", "Davies", "Evans", "Thomas", "Roberts", "Johnson", "Wilson", "Thompson", "Wright", "Robinson", "Wood", "Walker", "White", "Harris", "Martin", "Jackson", "Clarke"],
    "Netherlands": ["Jansen", "de Vries", "van Dijk", "Bakker", "Visser", "Smit", "Muller", "Meijer", "de Boer", "Bos", "Vos", "Peters", "Hendriks", "Dekker", "van der Meer", "Koster", "Jacobs", "Klein", "van der Berg", "Veenstra"],
    "Mexico": ["García", "Martínez", "González", "López", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres", "Rivera", "Morales", "Ortiz", "Cruz", "Reyes", "Gutiérrez", "Fernández", "Castro", "Acosta", "Silva", "Romero"],
    "Colombia": ["García", "Martínez", "González", "López", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres", "Rivera", "Morales", "Ortiz", "Cruz", "Reyes", "Gutiérrez", "Fernández", "Castro", "Acosta", "Silva", "Romero"],
    "Uruguay": ["García", "Martínez", "González", "López", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres", "Rivera", "Morales", "Ortiz", "Cruz", "Reyes", "Gutiérrez", "Fernández", "Castro", "Acosta", "Silva", "Romero"]
};

const youthNicknames = ["Ney", "Ronaldo", "Romário", "Rivaldo", "Ronaldinho", "Kaká", "Pelé", "Garrincha", "Zico", "Sócrates", "Dunga", "Messi", "Maradona", "Tevez", "Aguero", "Di Maria", "Cavani", "Suárez", "Forlán", "Pato", "Ganso", "Falcão", "Casemiro", "Firmino", "Coutinho", "Vini", "Endrick"];

const defaultYouthFirstNames = ["João", "Pedro", "Lucas", "Gabriel", "Rafael", "Matheus", "Felipe", "Bruno", "Anderson", "Thiago"];
const defaultYouthLastNames = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes"];

function getYouthName(country) {
    const isLatin = ["Brazil", "Argentina", "Colombia", "Uruguay", "Mexico", "Venezuela", "Peru", "Ecuador", "Chile", "Paraguay", "Bolivia"].includes(country);
    
    if (isLatin && Math.random() > 0.6) {
        return youthNicknames[Math.floor(Math.random() * youthNicknames.length)];
    }
    
    const firstNames = youthFirstNamesByCountry[country] || defaultYouthFirstNames;
    const lastNames = youthLastNamesByCountry[country] || defaultYouthLastNames;
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return firstName + " " + lastName;
}
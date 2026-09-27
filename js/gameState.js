// Estado Global do Jogo
const gameState = {
    playerTeamId: null, 
    playerBaseCompId: null,
    startYear: 2026, 
    currentWeek: 0, 
    currentDate: new Date(2026, 0, 7),
    pendingStages: [], 
    countrySeason: {}, 
    standings: {}, 
    globalStandings: {}, 
    phaseRankings: {},   
    fixtures: [], 
    teamMap: {}, 
    compMap: {}, 
    stages: {}, 
    activePhases: {}, 
    seasonMaxStage: {},
    titles: {}, 
    history: [], 
    mySquad: [], 
    selectedPlayerId: null,
    myLineup: { starters: [], bench: [], formation: '4-4-2', style: 'Equilibrado' },
    phaseByes: {},
    managerName: "Treinador",
    managerPhoto: null,
    inbox: []
};

let humanManagerName = "Treinador";
let isNameConfirmed = false;
let currentMainView = 'home';
let currentHighlightedNav = 'agenda';
let liveMatch = null;
let selectedTacticsSlot = null;
let marketState = { countryId: null, compId: null, teamId: null, tab: 'buy' };
let currentEditorCountry = null;
let currentEditorMode = 'teams';
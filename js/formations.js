const formationsDB = {
    "4-4-2": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '35%' }, { role: 'ZAG', top: '70%', left: '65%' },
        { role: 'LTE', top: '70%', left: '15%' }, { role: 'LTD', top: '70%', left: '85%' },
        { role: 'MC', top: '45%', left: '35%' }, { role: 'MC', top: '45%', left: '65%' },
        { role: 'MEI', top: '45%', left: '15%' }, { role: 'MEI', top: '45%', left: '85%' },
        { role: 'ATA', top: '20%', left: '35%' }, { role: 'ATA', top: '20%', left: '65%' }
    ],
    "4-3-3": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '35%' }, { role: 'ZAG', top: '70%', left: '65%' },
        { role: 'LTE', top: '70%', left: '15%' }, { role: 'LTD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '50%' },
        { role: 'MC', top: '40%', left: '30%' }, { role: 'MC', top: '40%', left: '70%' },
        { role: 'PTE', top: '25%', left: '20%' }, { role: 'PTD', top: '25%', left: '80%' },
        { role: 'ATA', top: '15%', left: '50%' }
    ],
    "4-2-3-1": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '35%' }, { role: 'ZAG', top: '70%', left: '65%' },
        { role: 'LTE', top: '70%', left: '15%' }, { role: 'LTD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '35%' }, { role: 'VOL', top: '55%', left: '65%' },
        { role: 'MEI', top: '35%', left: '50%' },
        { role: 'PTE', top: '35%', left: '20%' }, { role: 'PTD', top: '35%', left: '80%' },
        { role: 'ATA', top: '15%', left: '50%' }
    ],
    "4-1-4-1": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '35%' }, { role: 'ZAG', top: '70%', left: '65%' },
        { role: 'LTE', top: '70%', left: '15%' }, { role: 'LTD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '50%' },
        { role: 'MC', top: '40%', left: '35%' }, { role: 'MC', top: '40%', left: '65%' },
        { role: 'MEI', top: '40%', left: '15%' }, { role: 'MEI', top: '40%', left: '85%' },
        { role: 'ATA', top: '15%', left: '50%' }
    ],
    "4-4-1-1": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '35%' }, { role: 'ZAG', top: '70%', left: '65%' },
        { role: 'LTE', top: '70%', left: '15%' }, { role: 'LTD', top: '70%', left: '85%' },
        { role: 'MC', top: '45%', left: '35%' }, { role: 'MC', top: '45%', left: '65%' },
        { role: 'MEI', top: '45%', left: '15%' }, { role: 'MEI', top: '45%', left: '85%' },
        { role: 'MEI', top: '30%', left: '50%' },
        { role: 'ATA', top: '15%', left: '50%' }
    ],
    "4-2-2-2": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '35%' }, { role: 'ZAG', top: '70%', left: '65%' },
        { role: 'LTE', top: '70%', left: '15%' }, { role: 'LTD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '35%' }, { role: 'VOL', top: '55%', left: '65%' },
        { role: 'MEI', top: '35%', left: '25%' }, { role: 'MEI', top: '35%', left: '75%' },
        { role: 'ATA', top: '15%', left: '35%' }, { role: 'ATA', top: '15%', left: '65%' }
    ],
    "4-2-4": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '35%' }, { role: 'ZAG', top: '70%', left: '65%' },
        { role: 'LTE', top: '70%', left: '15%' }, { role: 'LTD', top: '70%', left: '85%' },
        { role: 'MC', top: '45%', left: '35%' }, { role: 'MC', top: '45%', left: '65%' },
        { role: 'PTE', top: '25%', left: '15%' }, { role: 'PTD', top: '25%', left: '85%' },
        { role: 'ATA', top: '20%', left: '35%' }, { role: 'ATA', top: '20%', left: '65%' }
    ],
    "3-5-2": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '25%' }, { role: 'ZAG', top: '70%', left: '50%' }, { role: 'ZAG', top: '70%', left: '75%' },
        { role: 'VOL', top: '55%', left: '35%' }, { role: 'VOL', top: '55%', left: '65%' },
        { role: 'MEI', top: '40%', left: '15%' }, { role: 'MC', top: '40%', left: '50%' }, { role: 'MEI', top: '40%', left: '85%' },
        { role: 'ATA', top: '20%', left: '35%' }, { role: 'ATA', top: '20%', left: '65%' }
    ],
    "3-4-3": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '25%' }, { role: 'ZAG', top: '70%', left: '50%' }, { role: 'ZAG', top: '70%', left: '75%' },
        { role: 'MC', top: '45%', left: '35%' }, { role: 'MC', top: '45%', left: '65%' },
        { role: 'MEI', top: '45%', left: '15%' }, { role: 'MEI', top: '45%', left: '85%' },
        { role: 'PTE', top: '20%', left: '25%' }, { role: 'ATA', top: '15%', left: '50%' }, { role: 'PTD', top: '20%', left: '75%' }
    ],
    "5-3-2": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '25%' }, { role: 'ZAG', top: '70%', left: '50%' }, { role: 'ZAG', top: '70%', left: '75%' },
        { role: 'LTE', top: '60%', left: '10%' }, { role: 'LTD', top: '60%', left: '90%' },
        { role: 'MC', top: '40%', left: '30%' }, { role: 'VOL', top: '45%', left: '50%' }, { role: 'MC', top: '40%', left: '70%' },
        { role: 'ATA', top: '20%', left: '35%' }, { role: 'ATA', top: '20%', left: '65%' }
    ],
    "5-4-1": [
        { role: 'GOL', top: '85%', left: '50%' },
        { role: 'ZAG', top: '70%', left: '25%' }, { role: 'ZAG', top: '70%', left: '50%' }, { role: 'ZAG', top: '70%', left: '75%' },
        { role: 'LTE', top: '60%', left: '10%' }, { role: 'LTD', top: '60%', left: '90%' },
        { role: 'MC', top: '40%', left: '35%' }, { role: 'MC', top: '40%', left: '65%' },
        { role: 'MEI', top: '35%', left: '20%' }, { role: 'MEI', top: '35%', left: '80%' },
        { role: 'ATA', top: '15%', left: '50%' }
    ]
};
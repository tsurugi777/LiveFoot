const formationsDB = {
    "4-4-2": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '35%' }, { role: 'ZC', top: '70%', left: '65%' },
        { role: 'LE', top: '70%', left: '15%' }, { role: 'LD', top: '70%', left: '85%' },
        { role: 'MLG', top: '45%', left: '35%' }, { role: 'MLG', top: '45%', left: '65%' },
        { role: 'MAT', top: '45%', left: '15%' }, { role: 'MAT', top: '45%', left: '85%' },
        { role: 'CA', top: '20%', left: '35%' }, { role: 'CA', top: '20%', left: '65%' }
    ],
    "4-3-3": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '35%' }, { role: 'ZC', top: '70%', left: '65%' },
        { role: 'LE', top: '70%', left: '15%' }, { role: 'LD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '50%' },
        { role: 'MLG', top: '40%', left: '30%' }, { role: 'MLG', top: '40%', left: '70%' },
        { role: 'PTE', top: '25%', left: '20%' }, { role: 'PTD', top: '25%', left: '80%' },
        { role: 'CA', top: '15%', left: '50%' }
    ],
    "4-2-3-1": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '35%' }, { role: 'ZC', top: '70%', left: '65%' },
        { role: 'LE', top: '70%', left: '15%' }, { role: 'LD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '35%' }, { role: 'VOL', top: '55%', left: '65%' },
        { role: 'MAT', top: '35%', left: '50%' },
        { role: 'PTE', top: '35%', left: '20%' }, { role: 'PTD', top: '35%', left: '80%' },
        { role: 'CA', top: '15%', left: '50%' }
    ],
    "4-1-4-1": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '35%' }, { role: 'ZC', top: '70%', left: '65%' },
        { role: 'LE', top: '70%', left: '15%' }, { role: 'LD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '50%' },
        { role: 'MLG', top: '40%', left: '35%' }, { role: 'MLG', top: '40%', left: '65%' },
        { role: 'MAT', top: '40%', left: '15%' }, { role: 'MAT', top: '40%', left: '85%' },
        { role: 'CA', top: '15%', left: '50%' }
    ],
    "4-4-1-1": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '35%' }, { role: 'ZC', top: '70%', left: '65%' },
        { role: 'LE', top: '70%', left: '15%' }, { role: 'LD', top: '70%', left: '85%' },
        { role: 'MLG', top: '45%', left: '35%' }, { role: 'MLG', top: '45%', left: '65%' },
        { role: 'MAT', top: '45%', left: '15%' }, { role: 'MAT', top: '45%', left: '85%' },
        { role: 'MAT', top: '30%', left: '50%' },
        { role: 'CA', top: '15%', left: '50%' }
    ],
    "4-2-2-2": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '35%' }, { role: 'ZC', top: '70%', left: '65%' },
        { role: 'LE', top: '70%', left: '15%' }, { role: 'LD', top: '70%', left: '85%' },
        { role: 'VOL', top: '55%', left: '35%' }, { role: 'VOL', top: '55%', left: '65%' },
        { role: 'MAT', top: '35%', left: '25%' }, { role: 'MAT', top: '35%', left: '75%' },
        { role: 'CA', top: '15%', left: '35%' }, { role: 'CA', top: '15%', left: '65%' }
    ],
    "4-2-4": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '35%' }, { role: 'ZC', top: '70%', left: '65%' },
        { role: 'LE', top: '70%', left: '15%' }, { role: 'LD', top: '70%', left: '85%' },
        { role: 'MLG', top: '45%', left: '35%' }, { role: 'MLG', top: '45%', left: '65%' },
        { role: 'PTE', top: '25%', left: '15%' }, { role: 'PTD', top: '25%', left: '85%' },
        { role: 'CA', top: '20%', left: '35%' }, { role: 'CA', top: '20%', left: '65%' }
    ],
    "3-5-2": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '25%' }, { role: 'ZC', top: '70%', left: '50%' }, { role: 'ZC', top: '70%', left: '75%' },
        { role: 'VOL', top: '55%', left: '35%' }, { role: 'VOL', top: '55%', left: '65%' },
        { role: 'MAT', top: '40%', left: '15%' }, { role: 'MLG', top: '40%', left: '50%' }, { role: 'MAT', top: '40%', left: '85%' },
        { role: 'CA', top: '20%', left: '35%' }, { role: 'CA', top: '20%', left: '65%' }
    ],
    "3-4-3": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '25%' }, { role: 'ZC', top: '70%', left: '50%' }, { role: 'ZC', top: '70%', left: '75%' },
        { role: 'MLG', top: '45%', left: '35%' }, { role: 'MLG', top: '45%', left: '65%' },
        { role: 'MAT', top: '45%', left: '15%' }, { role: 'MAT', top: '45%', left: '85%' },
        { role: 'PTE', top: '20%', left: '25%' }, { role: 'CA', top: '15%', left: '50%' }, { role: 'PTD', top: '20%', left: '75%' }
    ],
    "5-3-2": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '25%' }, { role: 'ZC', top: '70%', left: '50%' }, { role: 'ZC', top: '70%', left: '75%' },
        { role: 'LE', top: '60%', left: '10%' }, { role: 'LD', top: '60%', left: '90%' },
        { role: 'MLG', top: '40%', left: '30%' }, { role: 'VOL', top: '45%', left: '50%' }, { role: 'MLG', top: '40%', left: '70%' },
        { role: 'CA', top: '20%', left: '35%' }, { role: 'CA', top: '20%', left: '65%' }
    ],
    "5-4-1": [
        { role: 'GO', top: '85%', left: '50%' },
        { role: 'ZC', top: '70%', left: '25%' }, { role: 'ZC', top: '70%', left: '50%' }, { role: 'ZC', top: '70%', left: '75%' },
        { role: 'LE', top: '60%', left: '10%' }, { role: 'LD', top: '60%', left: '90%' },
        { role: 'MLG', top: '40%', left: '35%' }, { role: 'MLG', top: '40%', left: '65%' },
        { role: 'MAT', top: '35%', left: '20%' }, { role: 'MAT', top: '35%', left: '80%' },
        { role: 'CA', top: '15%', left: '50%' }
    ]
};
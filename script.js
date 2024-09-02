// Fetch JSON data with async/await and improved error handling
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Box-Muller transform to generate random numbers
function generateScore(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    let randNormal = mean + stdDev * randStdNormal;
    return Math.round(randNormal);
}

// Function to simulate a match
function simulateMatch(team1, team2) {
    const rankingDifference = team1.FIBARanking - team2.FIBARanking;
    let probability = 0.5 + (rankingDifference / 100);
    probability = Math.max(0, Math.min(1, probability)); // Clamp probability between 0 and 1

    // Simulate scores using normal distribution
    const team1Score = generateScore(85, 10); // Mean score of 85 with a standard deviation of 10
    const team2Score = generateScore(75, 10); // Mean score of 75 with a standard deviation of 10

    const result = team1Score > team2Score ? team1 : team2;
    return { winner: result, loser: result === team1 ? team2 : team1, team1Score, team2Score };
}

// Function to simulate group phase
function simulateGroupPhase(groups) {
    const results = {};
    const standings = {};

    for (const group in groups) {
        results[group] = [];
        standings[group] = groups[group].map(team => ({
            ...team,
            points: 0,
            scored: 0,
            conceded: 0
        }));

        const teams = groups[group];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const team1 = teams[i];
                const team2 = teams[j];
                const matchResult = simulateMatch(team1, team2);
                const { winner, loser, team1Score, team2Score } = matchResult;

                // Update standings
                const winnerStanding = standings[group].find(t => t.ISOCode === winner.ISOCode);
                const loserStanding = standings[group].find(t => t.ISOCode === loser.ISOCode);

                if (winnerStanding && loserStanding) {
                    winnerStanding.points += 2;
                    loserStanding.points += 1;

                    winnerStanding.scored += team1Score > team2Score ? team1Score : team2Score;
                    winnerStanding.conceded += team1Score > team2Score ? team2Score : team1Score;
                    loserStanding.scored += team1Score > team2Score ? team2Score : team1Score;
                    loserStanding.conceded += team1Score > team2Score ? team1Score : team2Score;

                    results[group].push({ match: `${team1.Team} vs ${team2.Team}`, result: `${team1Score}-${team2Score}`, winner: winner.Team });
                } else {
                    console.error('Team not found in standings:', winner, loser);
                }
            }
        }
    }
    return { results, standings };
}

// Function to rank teams
function rankTeams(standings) {
    const rankedTeams = [];

    for (const group in standings) {
        standings[group].sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            const aPointDifference = a.scored - a.conceded;
            const bPointDifference = b.scored - b.conceded;
            if (aPointDifference !== bPointDifference) return bPointDifference - aPointDifference;
            return b.scored - a.scored;
        });

        rankedTeams.push(...standings[group]);
    }

    rankedTeams.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        const aPointDifference = a.scored - a.conceded;
        const bPointDifference = b.scored - b.conceded;
        if (aPointDifference !== bPointDifference) return bPointDifference - aPointDifference;
        return b.scored - a.scored;
    });

    return rankedTeams.slice(0, 8);
}

// Function to assign teams to pots
function assignToPots(rankedTeams) {
    const pots = { D: [], E: [], F: [], G: [] };
    pots.D.push(rankedTeams[0], rankedTeams[1]);
    pots.E.push(rankedTeams[2], rankedTeams[3]);
    pots.F.push(rankedTeams[4], rankedTeams[5]);
    pots.G.push(rankedTeams[6], rankedTeams[7]);
    return pots;
}

// Function to draw quarterfinal matches
function drawQuarterfinals(pots) {
    const quarterfinals = [];
    const shuffledG = pots.G.sort(() => Math.random() - 0.5);
    const shuffledF = pots.F.sort(() => Math.random() - 0.5);

    quarterfinals.push([pots.D[0], shuffledG[0]]);
    quarterfinals.push([pots.D[1], shuffledG[1]]);
    quarterfinals.push([pots.E[0], shuffledF[0]]);
    quarterfinals.push([pots.E[1], shuffledF[1]]);

    return quarterfinals;
}

// Function to simulate elimination phase
function simulateEliminationPhase(pots) {
    const quarterfinals = drawQuarterfinals(pots);
    console.log('Quarterfinal Matches:', quarterfinals);

    const semifinalists = quarterfinals.map(match => simulateMatch(match[0], match[1]).winner);
    console.log('Semifinalists:', semifinalists);

    const semifinals = [
        [semifinalists[0], semifinalists[1]],
        [semifinalists[2], semifinalists[3]]
    ];
    console.log('Semifinal Matches:', semifinals);

    const finalists = semifinals.map(match => simulateMatch(match[0], match[1]).winner);
    console.log('Finalists:', finalists);

    const thirdPlaceMatch = simulateMatch(
        semifinalists[0] === finalists[0] ? semifinalists[1] : semifinalists[0],
        semifinalists[2] === finalists[1] ? semifinalists[3] : semifinalists[2]
    );
    const finalMatch = simulateMatch(finalists[0], finalists[1]);

    console.log('Third Place Match:', thirdPlaceMatch);
    console.log('Final Match:', finalMatch);

    return {
        thirdPlace: { winner: thirdPlaceMatch.winner, loser: thirdPlaceMatch.loser },
        final: { winner: finalMatch.winner, loser: finalMatch.loser }
    };
}

// Display results in the HTML
function displayResults(groupResults, groupStandings) {
    const groupResultsDiv = document.getElementById('group-results');
    if (!groupResultsDiv) {
        console.error('Group results div not found');
        return;
    }

    for (const group in groupResults) {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('group');
        groupDiv.innerHTML = `<h3>Group ${group}</h3>`;
        groupResults[group].forEach(match => {
            const matchDiv = document.createElement('div');
            matchDiv.classList.add('match');
            matchDiv.innerHTML = `
                <div class="team">${match.match.split(' vs ')[0]}</div>
                <div class="">VS</div>
                <div class="team">${match.match.split(' vs ')[1]}</div>
                <div class="winner">${match.winner}</div>
            `;
            groupDiv.appendChild(matchDiv);
        });
        groupResultsDiv.appendChild(groupDiv);
    }
}

// Main function to run the simulation
async function main() {
    try {
        const groups = await fetchData('groups.json');
        const exibitions = await fetchData('exibitions.json');

        console.log('Groups:', groups);
        console.log('Exibitions:', exibitions);

        const { results, standings } = simulateGroupPhase(groups);
        console.log('Group Phase Results:', results);

        const rankedTeams = rankTeams(standings);
        console.log('Ranked Teams:', rankedTeams);

        const pots = assignToPots(rankedTeams);
        console.log('Pots:', pots);

        const eliminationResults = simulateEliminationPhase(pots);
        console.log('Elimination Phase Results:', eliminationResults);

        console.log('Medal Winners:');
        console.log('1. ', eliminationResults.final.winner.Team);
        console.log('2. ', eliminationResults.final.loser.Team);
        console.log('3. ', eliminationResults.thirdPlace.winner.Team);

        // Display semi-finals results

        document.addEventListener('DOMContentLoaded', () => {
            function displaySemiFinalsResults(eliminationResults) {
                const semiFinalsDiv = document.getElementById('semi-finals-results');
                if (!semiFinalsDiv) {
                    console.error('Semi-finals results div not found');
                    return;
                }
        
                if (!eliminationResults || !Array.isArray(eliminationResults.semiFinals)) {
                    console.error('Invalid semi-finals data:', eliminationResults);
                    return;
                }
        
                eliminationResults.semiFinals.forEach((team, index) => {
                    if (!team || !team.Team) {
                        console.error('Invalid team data:', team);
                        return;
                    }
                    if (index % 2 === 0 && eliminationResults.semiFinals[index + 1] && eliminationResults.semiFinals[index + 1].Team) {
                        const matchDiv = document.createElement('div');
                        matchDiv.classList.add('match');
                        matchDiv.innerHTML = `
                            <div class="team">${team.Team}</div>
                            <div class="team">${eliminationResults.semiFinals[index + 1].Team}</div>
                        `;
                        semiFinalsDiv.appendChild(matchDiv);
                    }
                });
            }
        
        /*    // test
            const eliminationResults = {
                semiFinals: [
                    { Team: 'Team A' },
                    { Team: 'Team B' },
                    { Team: 'Team C' },
                    { Team: 'Team D' }
                ]
            };
        */
            displaySemiFinalsResults(eliminationResults);
        });
        
        // Display bronze match result
        const bronzeMatchDiv = document.getElementById('bronze-match-result');
        if (!bronzeMatchDiv) {
            console.error('Bronze match result div not found');
            return;
        }
        bronzeMatchDiv.innerHTML = `
            <div class="team">${eliminationResults.thirdPlace.winner.Team}</div>
            <div class="team">${eliminationResults.thirdPlace.loser.Team}</div>
        `;

        // Display gold match result
        const goldMatchDiv = document.getElementById('gold-match-result');
        if (!goldMatchDiv) {
            console.error('Gold match result div not found');
            return;
        }
        goldMatchDiv.innerHTML = `
            <div class="team">${eliminationResults.final.winner.Team}</div>
            <div class="team">${eliminationResults.final.loser.Team}</div>
        `;

    } catch (error) {
        console.error('Error in main function:', error);
    }
    
}

// Start the tournament simulation
main();

const fs = require('fs');

// Load JSON data
const groups = JSON.parse(fs.readFileSync('groups.json', 'utf8'));
const exhibitions = JSON.parse(fs.readFileSync('exibitions.json', 'utf8'));

//Box-Muller transform to generate normally distributed random numbers
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
  
          winnerStanding.points += 2;
          loserStanding.points += 1;
  
          winnerStanding.scored += team1Score > team2Score ? team1Score : team2Score;
          winnerStanding.conceded += team1Score > team2Score ? team2Score : team1Score;
          loserStanding.scored += team1Score > team2Score ? team2Score : team1Score;
          loserStanding.conceded += team1Score > team2Score ? team1Score : team2Score;
  
          results[group].push({ match: `${team1.Team} vs ${team2.Team}`, result: `${team1Score}-${team2Score}`, winner: winner.Team });
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
  
    const thirdPlaceMatch = simulateMatch(semifinalists[0] === finalists[0] ? semifinalists[1] : semifinalists[0], semifinalists[2] === finalists[1] ? semifinalists[3] : semifinalists[2]);
    const finalMatch = simulateMatch(finalists[0], finalists[1]);
  
    console.log('Third Place Match:', thirdPlaceMatch);
    console.log('Final Match:', finalMatch);
  
    return {
      thirdPlace: { winner: thirdPlaceMatch.winner, loser: thirdPlaceMatch.loser },
      final: { winner: finalMatch.winner, loser: finalMatch.loser }
    };
  }
/*  
  const thirdPlaceMatch = simulateMatch(semifinalists[2], semifinalists[3]);    

  return {
    thirdPlace: { winner: thirdPlaceMatch, loser: semifinalists[2] === thirdPlaceMatch ? semifinalists[3] : semifinalists[2] },
    final: { winner: finalMatch, loser: finalists[0] === finalMatch ? finalists[1] : finalists[0] }
  };
*/

// Main function to run the simulation
function main() {
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
  }

main();
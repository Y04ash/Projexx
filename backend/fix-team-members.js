const mongoose = require('mongoose');
const StudentTeam = require('./models/studentTeamSchema');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://yashr:NPuILa9Awq8H0DED@cluster0.optidea.mongodb.net/project_management?retryWrites=true&w=majority&appName=Cluster0');

async function fixTeamMembers() {
  try {
    console.log('🔍 Finding teams where creator is not in members...');
    
    // Find all teams
    const teams = await StudentTeam.find({});
    console.log(`📊 Found ${teams.length} teams total`);
    
    let fixedCount = 0;
    
    for (const team of teams) {
      if (!team.creator) {
        console.log(`⚠️  Team ${team.name} has no creator, skipping...`);
        continue;
      }
      
      const creatorId = team.creator.toString();
      const memberIds = team.members.map(m => m.toString());
      
      if (!memberIds.includes(creatorId)) {
        console.log(`📝 Fixing team: ${team.name} (ID: ${team._id})`);
        console.log(`   Creator: ${creatorId}`);
        console.log(`   Current members: ${memberIds.join(', ')}`);
        
        // Add creator to members array
        team.members.push(new mongoose.Types.ObjectId(creatorId));
        await team.save();
        
        console.log(`   ✅ Added creator to members array`);
        fixedCount++;
      } else {
        console.log(`✅ Team ${team.name} already has creator in members`);
      }
    }
    
    console.log(`🎉 Team members fix completed! Fixed ${fixedCount} teams.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing team members:', error);
    process.exit(1);
  }
}

fixTeamMembers();

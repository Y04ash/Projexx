const express = require("express");
const router = express.Router();

const StudentTeam = require("../models/studentTeamSchema");
const Student = require("../models/studentSchema");
const ProjectServer = require("../models/projectServerSchema");
const verifyToken = require("../middleware/verifyToken");

// Create a new team (emails sent from frontend)
router.post("/createTeam", verifyToken, async (req, res) => {
  try {
    const { name, projectServerCode, studentEmails, problemStatement } = req.body;

    // Validate input
    if (!name || !problemStatement || !projectServerCode || !Array.isArray(studentEmails)) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🔍 Fetch students by email addresses
    const students = await Student.find({ email: { $in: studentEmails } });

    if (students.length !== studentEmails.length) {
      return res.status(404).json({ message: "Some student emails not found" });
    }

    const studentIds = students.map(s => s._id);

    // 🔁 Find Project Server by code
    const projectServer = await ProjectServer.findOne({ code: projectServerCode });

    if (!projectServer) {
      return res.status(404).json({ message: "Project server not found" });
    }

    // 📦 Create the team
    const newTeam = new StudentTeam({
      name,
      problemStatement,
      projectServer: projectServer.code,
      members: studentIds
    });

    const savedTeam = await newTeam.save();

    // 🔄 Update students' joinedTeams
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $push: { joinedTeams: savedTeam._id } }
    );

    res.status(201).json({ message: "Team created successfully", team: savedTeam });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating team", error: err.message });
  }
});

// Get teams under a project server
router.get("/byProjectServer/:projectServerId", verifyToken, async (req, res) => {
  try {
    const { projectServerId } = req.params;

    const teams = await StudentTeam.find({ projectServer: projectServerId }).populate("members");

    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch teams", error: err.message });
  }
});

// Get teams a student has joined
router.get("/byStudent/:studentId", verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    // or to use studentId without params use "studnetId = req.user.id" and remove the params from the url
    const student = await Student.findById(studentId).populate("joinedTeams");
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json(student.joinedTeams);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch joined teams", error: err.message });
  }
});

module.exports = router;

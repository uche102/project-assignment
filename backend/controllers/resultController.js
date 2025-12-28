const pool = require("../db");

// Upload a new result
exports.uploadResult = async (req, res) => {
  try {
    const { student_id, course_code, grade, unit } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;

    const query = `
      INSERT INTO results_pg (student_id, course_code, grade, unit, file_path)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [student_id, course_code, grade, unit, filePath];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Result uploaded successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Upload Result Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getStudentResults = async (req, res) => {
  try {
    const { student_id } = req.params;

    const query = `
      SELECT
        id,
        student_id,
        course_code,
        grade,
        unit,
        file_path
      FROM results_pg
      WHERE student_id = $1
      ORDER BY id DESC
    `;

    const result = await pool.query(query, [student_id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Get Student Results Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

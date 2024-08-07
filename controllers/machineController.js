const db = require("../config/database");
const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "../logs/machines");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const getLogFileName = (machine_id) => {
  return path.join(logsDir, `${machine_id}.json`);
};

const writeLog = (logData) => {
  const logFileName = getLogFileName(logData.machine_id);
  const timestamp = new Date().toISOString();
  logData.timestamp = timestamp;

  let logs = [];
  if (fs.existsSync(logFileName)) {
    try {
      const fileContent = fs.readFileSync(logFileName, "utf-8");
      logs = JSON.parse(fileContent);
    } catch (err) {
      console.error("Log dosyası okunurken hata oluştu:", err);
    }
  }

  logs.push(logData);

  fs.writeFile(logFileName, JSON.stringify(logs, null, 2), (err) => {
    if (err) {
      console.error("Log yazma hatası:", err);
    }
  });
};

const getAllMachines = (req, res) => {
  const role = req.user.role;
  const user_id = req.user.id;

  switch (role) {
    case "Admin":
      try {
        db.query("SELECT * FROM machine;", (err, result) => {
          if (err) {
            console.log("Makineleri alırken hata oluştu:", err);
            res.status(500).send("Makineleri alırken hata oluştu");
          } else {
            res.json(result);
          }
        });
      } catch (error) {
        console.error(error);
        res.status(500).send("Sunucu hatası");
      }
      break;

    case "Owner":
      try {
        db.query(
          "SELECT * FROM machine WHERE owner_id = ?",
          [user_id],
          (err, result) => {
            if (err) {
              console.log("Makinelerini alırken hata oluştu:", err);
              res.status(500).send("Makinelerini alırken hata oluştu");
            } else {
              res.json(result);
            }
          }
        );
      } catch (error) {
        console.error(error);
        res.status(500).send("Sunucu hatası");
      }
      break;

    case "User":
      try {
        db.query(
          "SELECT * FROM machine WHERE user_id = ?",
          [user_id],
          (err, result) => {
            if (err) {
              console.log("Makineleri alırken hata oluştu:", err);
              res.status(500).send("Makineleri alırken hata oluştu");
            } else {
              res.json(result);
            }
          }
        );
      } catch (error) {
        console.error(error);
        res.status(500).send("Sunucu hatası");
      }
      break;

    default:
      try {
        db.query("SELECT * FROM machine;", (err, result) => {
          if (err) {
            console.log("Makineleri alırken hata oluştu:", err);
            res.status(500).send("Makineleri alırken hata oluştu");
          } else {
            res.json(result);
          }
        });
      } catch (error) {
        console.error(error);
        res.status(500).send("Sunucu hatası");
      }
      break;
  }
};

const getMachineById = (req, res) => {
  const machine_id = req.params.machine_id;

  try {
    const sql = "SELECT * FROM machine WHERE machine_id = ?";
    db.query(sql, [machine_id], (err, machine) => {
      if (err) {
        console.error("Makinayı alırken hata oluştu:", err);
        res.send("Makinayı alırken hata oluştu");
      } else if (machine.length > 0) {
        res.json(machine[0]);
      } else {
        res.json({
          message: "Makina bulunamadı",
        });
      }
    });
  } catch (error) {
    console.error("Sunucu hatası:", error);
    res.send("Sunucu hatası");
  }
};

const createMachine = (req, res) => {
  const { owner_id, machine_name, details } = req.body;

  const checkUserSql = "SELECT * FROM user WHERE user_id = ?";
  db.query(checkUserSql, [owner_id], (err, user) => {
    if (err) {
      console.error("Kullanıcı doğrulanırken hata oluştu:", err);
      return res.status(500).send("Kullanıcı doğrulanırken hata oluştu");
    } else if (user.length === 0) {
      return res.status(400).send("Geçersiz owner_id: Kullanıcı bulunamadı");
    } else {
      const createMachineSql =
        "INSERT INTO machine (owner_id, machine_name, details) VALUES (?, ?, ?)";

      const detailsJson = JSON.stringify(details);

      db.query(
        createMachineSql,
        [owner_id, machine_name, detailsJson],
        (err, result) => {
          if (err) {
            console.error("Makina oluşturulurken hata oluştu:", err);
            return res.status(500).send("Makina oluşturulurken hata oluştu");
          } else {
            const newMachineId = result.insertId;
            res.status(201).send("Makina başarıyla oluşturuldu");
            writeLog({
              action: "create",
              machine_id: newMachineId,
              machine_name: machine_name,
              details: detailsJson,
            });
          }
        }
      );
    }
  });
};

const updateMachine = (req, res) => {
  const machine_id = req.params.machine_id;
  const { owner_id, machine_name, details } = req.body;

  const checkUserSql = "SELECT * FROM user WHERE user_id = ?";
  db.query(checkUserSql, [owner_id], (err, user) => {
    if (err) {
      console.error("Kullanıcı doğrulanırken hata oluştu:", err);
      return res.send("Kullanıcı doğrulanırken hata oluştu");
    } else if (user.length === 0) {
      return res.send("Geçersiz owner_id: Kullanıcı bulunamadı");
    } else {
      const sql =
        "UPDATE machine SET owner_id = ?, machine_name = ?, details = ? WHERE machine_id = ?";
      db.query(
        sql,
        [owner_id, machine_name, details, machine_id],
        (err, result) => {
          if (err) {
            console.log("Makina güncellenirken hata oluştu:", err);
            res.send("sa");
          } else if (result.affectedRows > 0) {
            res.send("Makina başarıyla güncellendi");
            writeLog({
              action: "update",
              machine_id: machine_id,
              machine_name: machine_name,
              details: details,
            });
          } else {
            res.send("Makina bulunamadı");
          }
        }
      );
    }
  });
};

const deleteMachine = (req, res) => {
  const machine_id = req.params.machine_id;

  const checkSql = "SELECT * FROM machine WHERE machine_id = ?";
  db.query(checkSql, [machine_id], (err, results) => {
    if (err) {
      console.error("Makina kontrol edilirken hata oluştu:", err);
      return res.send("Makina kontrol edilirken hata oluştu");
    }
    const deleteSql = "DELETE FROM machine WHERE machine_id = ?";
    db.query(deleteSql, [machine_id], (err, result) => {
      if (err) {
        console.error("Makina silinirken hata oluştu:", err);
        return res.send("Makina silinirken hata oluştu");
      }

      if (result.affectedRows > 0) {
        res.send("Makina başarıyla silindi");
        writeLog({
          action: "delete",
          machine_id: machine_id,
        });
      } else {
        res.send("Makina bulunamadı");
      }
    });
  });
};

module.exports = {
  getAllMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
};

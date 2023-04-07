const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());

const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const instalization = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db ERROR ${e.message}`);
    process.exit(1);
  }
};

instalization();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers.authorization;

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_CODE", async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = user.username;
        next();
      }
    });
  }
};

// api login

const camelCaseCaher = (dbuserC) => {
  return {
    stateId: dbuserC.state_id,
    stateName: dbuserC.state_name,
    population: dbuserC.population,
  };
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `select * from user where username = '${username}'`;
  const dbuser = await db.get(userQuery);
  if (dbuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordTrue = await bcrypt.compare(password, dbuser.password);
    if (isPasswordTrue) {
      const paylod = { username: username };
      const jwtToken = jwt.sign(paylod, "MY_CODE");
      response.send({ jwtToken: jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/states/", authenticateToken, async (request, response) => {
  const getAllstatesQueary = `select * from state`;
  const dbstates = await db.all(getAllstatesQueary);
  const chngeChartes = dbstates.map((eachState) => {
    return camelCaseCaher(eachState);
  });
  response.send(chngeChartes);
});

// api 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const seleectUserQuery = `select * from state where state_id = ${stateId}`;
  const dbstates = await db.get(seleectUserQuery);
  response.send({
    stateId: dbstates.state_id,
    stateName: dbstates.state_name,
    population: dbstates.population,
  });
});

//API 4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const Insertnewdistrict = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})
  `;
  const addDbNewDistic = await db.run(Insertnewdistrict);
  response.send("District Successfully Added");
});

//API 5
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    const getDistrictsQuery = `select * from district where  district_id = ${districtId}`;

    const district = await db.get(getDistrictsQuery);
    response.send({
      districtId: district.district_id,
      districtName: district.district_name,
      stateId: district.state_id,
      cases: district.cases,
      cured: district.cured,
      active: district.active,
      deaths: district.deaths,
    });
  }
);

//API 6

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleleQuery = `delete from district where district_id = ${districtId}`;
    await db.run(deleleQuery);
    console.log("District Removed");
  }
);

///API 7

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const { districtId } = request.params;

    const updateDistic = `UPDATE district
     SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    where district_id = ${districtId}
    `;
    await db.run(updateDistic);
    response.send("District Details Updated");
  }
);
//API 8
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getAllQstates = `
    select
     sum(cases) as totalCases,
     sum(cured) as totalCured,
     sum(active) as totalActive,
     sum(deaths) as totalDeaths
     from district where state_id = ${stateId}`;
    const gatllDb = await db.get(getAllQstates);
    response.send(gatllDb);
  }
);
module.exports = app;

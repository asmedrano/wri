package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/lib/pq"
	"github.com/gorilla/mux"
	"log"
	"net/http"
	"strings"
	"os"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", HomeHandler)
	r.HandleFunc("/lakes", LakesHandler)
	r.HandleFunc("/lakes/geom", LakesGeomHandler)
	r.HandleFunc("/access", AccessHandler)
	http.Handle("/", r)
	fmt.Print("Starting Server...\n")
	http.ListenAndServe(":8000", nil)
}

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("hi"))
}

/* Resource for the lakes table
Fields Available are:
    gid        | integer                     | not null default nextval('lakes_gid_seq'::regclass)
    objectid   | numeric(10,0)               |
    island     | character varying(1)        |
    name       | character varying(50)       |
    wbid       | character varying(20)       |
    acres      | numeric                     |
    pond       | character varying(10)       |
    trout_stk  | character varying(4)        |
    pubacc     | character varying(4)        |
    boatramp   | character varying(4)        |
    rstrctn    | character varying(25)       |
    shoremiles | numeric                     |
    srpw       | integer                     |
    cold       | character varying(4)        |
    wqs        | character varying(6)        |
    cat        | character varying(6)        |
    shape_area | numeric                     |
    shape_len  | numeric                     |
    geom       | geometry(MultiPolygon,4326) |

*/

type LakeResource struct {
	Gid         int64
	ObjectId    int64
	Island      string
	Name        string
	Wbid        string
	Acres       float64
	Pond        string
	TroutStk    string
	PubAcc      string
	BoatRamp    string
	Restriction string
	ShoreMiles  float64
	SRPW        int64
	Cold        string
	WQS         string
	Cat         string
}

// Returns a map string of a name and the type of query to use
func queryType(name string, qtype string) map[string]string {
	m := map[string]string{
		"name":  name,
		"qtype": qtype,
	}
	return m

}
func parseQueryStr(r *http.Request, qm map[string]map[string]string) map[string]string {
	m := map[string]string{}

	for k, _ := range qm {
		v := r.FormValue(k)
		if v != "" {
			m[k] = v
		}
	}

	return m
}

/* a map the specifies the type of query to perform*/
var lakesQueryMap = map[string]map[string]string{
	"n":  queryType("name", "ILIKE"),  //name
	"p":  queryType("pond", "="),      // pond
	"t":  queryType("trout_stk", "="), // trout
	"pa": queryType("pubacc", "="),    // pubacc
	"br": queryType("boatramp", "="),  //boatramp
	"c":  queryType("cold", "="),      //cold
	"i":  queryType("island", "="),
    "cat": queryType("cat", "="), //category
}

func buildLakesQuery(m map[string]string) (string, []interface{}) {
    /*Actually builds the query we pass into SQL*/
	query := ""
	vals := []interface{}{}
	prefix := "WHERE"
	for k, v := range m { // v is the value coming from the GET params
		qm := lakesQueryMap[k]
		if qm["qtype"] == "ILIKE" {
			v = "%" + v + "%"
		}
		vals = append(vals, v)
		if len(vals)-1 > 0 {
			prefix = "AND"
		}
		query += fmt.Sprintf(" %s %s %s $%d", prefix, qm["name"], qm["qtype"], len(vals))

	}
	return query, vals
}

func LakesHandler(w http.ResponseWriter, r *http.Request) {

	db := GetDB()
	defer db.Close()

	rQ := parseQueryStr(r, lakesQueryMap)
	qs, qv := buildLakesQuery(rQ)
	var rows *sql.Rows
	var err error

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	query := "SELECT gid, objectid, island, name, wbid, acres, pond, trout_stk, pubacc, boatramp, rstrctn, srpw, cold, wqs, cat FROM lakes"
	if qs != "" {
		query += qs
	}
	query += " ORDER BY name"

	if qs == "" {
		rows, err = db.Query(query)
	} else {
		rows, err = db.Query(query, qv...)
	}
	defer rows.Close()

	results := map[string]LakeResource{}

	if err != nil {
		log.Print(err)
	}
	for rows.Next() {
		r := LakeResource{}
		if err := rows.Scan(&r.Gid, &r.ObjectId, &r.Island, &r.Name, &r.Wbid, &r.Acres, &r.Pond, &r.TroutStk, &r.PubAcc, &r.BoatRamp, &r.Restriction, &r.SRPW, &r.Cold, &r.WQS, &r.Cat); err != nil {
			log.Print(err)
		}
		results[fmt.Sprintf("%d", r.Gid)] = r
	}

	if err := rows.Err(); err != nil {
		log.Print(err)
	}

	js, err := json.Marshal(results)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}


	w.Write(js)

}

type GeomResource struct {
	Gid  int64
	Name string
	Geom string
}

func LakesGeomHandler(w http.ResponseWriter, r *http.Request) {
	db := GetDB()
	defer db.Close()
	var rows *sql.Rows
	var err error

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	r.ParseForm()
	geoms := r.Form["g"]
	results := []GeomResource{}
	query := fmt.Sprintf("SELECT gid, name, ST_AsGeoJSON(geom) FROM lakes WHERE gid IN (%s)", strings.Join(geoms, ","))
	rows, err = db.Query(query)
	defer rows.Close()
	for rows.Next() {
		g := GeomResource{}
		if err := rows.Scan(&g.Gid, &g.Name, &g.Geom); err != nil {
			log.Print(err)
		}
		results = append(results, g)
	}

	if err = rows.Err(); err != nil {
		log.Print(err)
	}

	js, err := json.Marshal(results)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write(js)
}

/*
 Access Data looks like:

 gid       | integer                | not null default nextval('fish_access_gid_seq'::regclass)
 id        | numeric                |
 name      | character varying(50)  |
 rmp_cns   | character varying(254) |
 rmp_cnd   | character varying(254) |
 park      | character varying(50)  |
 rstrctn   | character varying(254) |
 uni       | character varying(1)   |
 type      | character varying(20)  |
 wat_ttp   | character varying(8)   |
 lat       | double precision       |
 lon       | double precision       |
 ownership | character varying(20)  |
 geom      | geometry(Point)        |

*/
var accessQueryMap = map[string]map[string]string{
	"n":  queryType("name", "ILIKE"), //name
	"wt": queryType("wat_ttp", "="),  // water type
	"t":  queryType("rstrctn", "ILIKE"), //we can infer trout stk from here
	"br":  queryType("type", "ILIKE"), //we can infer boat ramp from here by sear
}

// TODO:Dry this up
func buildAccessQuery(m map[string]string) (string, []interface{}) {
	query := ""
	vals := []interface{}{}
	prefix := "WHERE"
	for k, v := range m { // again v is the value coming from the 
        // Some special value modifiers
        if k == "t" {
            // To find trout stock we have to actually search for "stocked with trout"
            if v == "Y" {
                v = "stocked with trout"
            }
        }
        if k == "br" {
            // To find boat ramps  we have to search for "Boat"
            if v == "Y" {
                v = "Boat"
            }
        }

		qm := accessQueryMap[k]
		if qm["qtype"] == "ILIKE" {
			v = "%" + v + "%"
		}
		vals = append(vals, v)
		if len(vals)-1 > 0 {
			prefix = "AND"
		}
		query += fmt.Sprintf(" %s %s %s $%d", prefix, qm["name"], qm["qtype"], len(vals))

	}
	return query, vals
}

type AccessResource struct {
	Gid         int64 
	Id          string
	Name        string
	Rmp_Cns     sql.NullString
	Rmp_Cnd     sql.NullString
	Park        sql.NullString
	Restriction sql.NullString
	Uni         sql.NullString
	Type        sql.NullString
	Wat_ttp     sql.NullString
	Lat         float32
	Lon         float32
	Ownership   string
	Geom        string
}

func (a *AccessResource) MarshalJSON() ([]byte, error){
    m := struct {
        Gid         int64
        Id          string
        Name        string
        Rmp_Cns     string
        Rmp_Cnd     string
        Park        string
        Restriction string
        Uni         string
        Type        string
        Wat_ttp     string
        Lat         float32
        Lon         float32
        Ownership   string
        Geom        string
    }{
        a.Gid, 
        a.Id,
        a.Name, 
        a.Rmp_Cns.String,
        a.Rmp_Cnd.String,
        a.Park.String,
        a.Restriction.String,
        a.Uni.String,
        a.Type.String,
        a.Wat_ttp.String,
        a.Lat,
        a.Lon,
        a.Ownership, 
        a.Geom,
    }

    return json.Marshal(m)
}


func AccessHandler(w http.ResponseWriter, r *http.Request) {
	db := GetDB()
	defer db.Close()

	rQ := parseQueryStr(r, accessQueryMap)
	qs, qv := buildAccessQuery(rQ)
	var rows *sql.Rows
	var err error

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	query := "SELECT gid, id, name, rmp_cns, rmp_cnd, park, rstrctn, uni, type, wat_ttp, lat, lon, ownership, ST_AsGeoJSON(geom) FROM fish_access"
	if qs != "" {
		query += qs
	}
	query += " ORDER BY name"

	if qs == "" {
		rows, err = db.Query(query)
	} else {
		rows, err = db.Query(query, qv...)
	}
	defer rows.Close()

	results := []AccessResource{}

	if err != nil {
		log.Print(err)
	}

	for rows.Next() {
		r := AccessResource{}
		if err := rows.Scan(&r.Gid, &r.Id, &r.Name, &r.Rmp_Cns, &r.Rmp_Cnd, &r.Park, &r.Restriction, &r.Uni, &r.Type, &r.Wat_ttp, &r.Lat, &r.Lon, &r.Ownership, &r.Geom); err != nil {
		    log.Print(err)
		}
		results = append(results, r)
	}

	if err := rows.Err(); err != nil {
		log.Print(err)
	}

	js, err := json.Marshal(results)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(js)
}

// A little stub to connect to our database
func GetDB() *sql.DB {
    dbUser := os.Getenv("WRI_DB_USER")
    dbPass := os.Getenv("WRI_DB_PASS")
    dbName := os.Getenv("WRI_DB_NAME")
    dbHost := os.Getenv("WRI_DB_HOST")

	connStr := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable", dbUser, dbPass, dbName, dbHost, "5432") // i think 5432 is safe to assume
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Print(err)
	}
	return db
}

package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/bmizerany/pq"
	"github.com/gorilla/mux"
	"log"
	"net/http"
	"strings"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", HomeHandler)
	r.HandleFunc("/lakes", LakesHandler)
	r.HandleFunc("/geom", GeomHandler)
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

var queryMap = map[string]map[string]string{
	"n":  queryType("name", "ILIKE"), //name
	"p":  queryType("pond", "="),          // pond
	"t":  queryType("trout_stk", "="),     // trout
	"pa": queryType("pubacc", "="),        // pubacc
	"br": queryType("boatramp", "="),      //boatramp
	"c":  queryType("cold", "="),          //cold
	"i":  queryType("island", "="),
}

func parseLakesQueryStr(r *http.Request) map[string]string {
	m := map[string]string{}

	for k, _ := range queryMap {
		v := r.FormValue(k)
		if v != "" {
			m[k] = v
		}
	}

	return m
}

func buildLakesQuery(m map[string]string) (string, []interface{}) {
	query := ""
	vals := []interface{}{}
	prefix := "WHERE"
	for k, v := range m {
		qm := queryMap[k]
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

	rQ := parseLakesQueryStr(r)
	qs, qv := buildLakesQuery(rQ)
	var rows *sql.Rows
	var err error

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

	results := []LakeResource{}

	if err != nil {
		log.Print(err)
	}
	for rows.Next() {
		r := LakeResource{}
		if err := rows.Scan(&r.Gid, &r.ObjectId, &r.Island, &r.Name, &r.Wbid, &r.Acres, &r.Pond, &r.TroutStk, &r.PubAcc, &r.BoatRamp, &r.Restriction, &r.SRPW, &r.Cold, &r.WQS, &r.Cat); err != nil {
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

    w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.Write(js)

}


type GeomResource struct {
    Gid int64
    Name string
    Geom string
}

func GeomHandler(w http.ResponseWriter, r *http.Request) {
    db := GetDB()
	defer db.Close()
	var rows *sql.Rows
	var err error
    r.ParseForm()
    geoms := r.Form["g"]
    results := []GeomResource{}
    query:= fmt.Sprintf("SELECT gid, name, ST_AsGeoJSON(geom) FROM lakes WHERE gid IN (%s)", strings.Join(geoms, ","))
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
    w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}


// A little stub to connect to our database
func GetDB() *sql.DB {
	connStr := fmt.Sprintf("user=%s dbname=%s host=%s port=%s sslmode=disable", "amedrano", "wildri", "127.0.0.1", "5432")
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Print(err)
	}
	return db
}

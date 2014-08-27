package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/bmizerany/pq"
	"github.com/gorilla/mux"
	"log"
	"net/http"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", HomeHandler)
	r.HandleFunc("/lakes", LakesHandler)
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

func LakesHandler(w http.ResponseWriter, r *http.Request) {

    db := GetDB()
    defer db.Close()

	query := "SELECT gid, objectid, island, name, wbid, acres, pond, trout_stk, pubacc, boatramp, rstrctn, srpw, cold, wqs, cat FROM lakes"

	query += " ORDER BY name"

	rows, err := db.Query(query)
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


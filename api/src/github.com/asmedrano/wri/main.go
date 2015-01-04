package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/asmedrano/wri/resources"
	"github.com/asmedrano/wri/tools"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"log"
	"net/http"
	"strings"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/lakes", LakesHandler)
	r.HandleFunc("/geom", GeomHandler)
	r.HandleFunc("/access", AccessHandler)
	r.HandleFunc("/rivers", RiversHandler)
	r.HandleFunc("/dams", DamsHandler)
	http.Handle("/", r)
	fmt.Print("Starting Server...\n")
	http.ListenAndServe(":8000", nil)
}

var riversQueryMap = map[string]map[string]string{
	"n":   tools.QueryType("name", "ILIKE"), //name
	"cat": tools.QueryType("cat", "="),      //category
	"c":   tools.QueryType("cold", "="),     //cold
	"gq":  tools.QueryType("geom", "GEO"),   // THIS doesnt anything just cause ParseQuery to capture the value

}

func buildRiversQuery(m map[string]string) (string, []interface{}) {
	/*Actually builds the query we pass into SQL*/
	query := ""
	vals := []interface{}{}
	prefix := " WHERE"
	for k, v := range m { // v is the value coming from the GET params
		qm := riversQueryMap[k]
		if qm["qtype"] != "GEO" {
			if qm["qtype"] == "ILIKE" {
				v = "%" + v + "%"
			}
			vals = append(vals, v)
			if len(vals)-1 > 0 {
				prefix = "AND"
			}
			query += fmt.Sprintf(" %s %s %s $%d", prefix, qm["name"], qm["qtype"], len(vals))
		}
	}

	// Finally do something with the geoQuery if its there
	if val, ok := m["gq"]; ok {
		//if there is a geo component, add it to the query
		vl := len(vals)
		bounds := tools.UnmarshalMapBounds(val)
		query += fmt.Sprintf("%s ST_Contains(ST_MakeEnvelope($%d, $%d, $%d, $%d), ST_Centroid(geom)) ",
			prefix, vl+1, vl+2, vl+3, vl+4)
		vals = append(vals, bounds.Southwest["lng"])
		vals = append(vals, bounds.Southwest["lat"])
		vals = append(vals, bounds.Northeast["lng"])
		vals = append(vals, bounds.Northeast["lat"])
	}

	return query, vals
}

func RiversHandler(w http.ResponseWriter, r *http.Request) {

	db := tools.GetDB()
	defer db.Close()

	rQ := tools.ParseQueryStr(r, riversQueryMap)
	qs, qv := buildRiversQuery(rQ)
	var rows *sql.Rows
	var err error

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	query := "SELECT gid, objectid, name, wbid, cold, rivmiles, label, wqs, cat FROM rivers_streams"
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

	results := map[string]resources.RiverResource{}

	if err != nil {
		log.Print(err)
	}
	for rows.Next() {
		r := resources.RiverResource{}
		if err := rows.Scan(&r.Gid, &r.ObjectId, &r.Name, &r.Wbid, &r.Cold, &r.RivMiles, &r.Label, &r.WQS, &r.Cat); err != nil {
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

/* a map the specifies the type of query to perform
   the key is the GET param
*/
var lakesQueryMap = map[string]map[string]string{
	"n":   tools.QueryType("name", "ILIKE"),  //name
	"p":   tools.QueryType("pond", "="),      // pond
	"t":   tools.QueryType("trout_stk", "="), // trout
	"pa":  tools.QueryType("pubacc", "="),    // pubacc
	"br":  tools.QueryType("boatramp", "="),  //boatramp
	"c":   tools.QueryType("cold", "="),      //cold
	"i":   tools.QueryType("island", "="),
	"cat": tools.QueryType("cat", "="),    //category
	"gq":  tools.QueryType("geom", "GEO"), // THIS doesnt anything just cause ParseQuery to capture the value
}

// Where `m` is a map returned from ParseQuery
func buildLakesQuery(m map[string]string) (string, []interface{}) {
	/*Actually builds the query we pass into SQL*/
	query := ""
	vals := []interface{}{}
	prefix := " WHERE"

	for k, v := range m { // v is the value coming from the GET params
		qm := lakesQueryMap[k]
		if qm["qtype"] != "GEO" {
			switch qm["qtype"] {
			case "ILIKE":
				v = "%" + v + "%"
			}
			vals = append(vals, v)
			if len(vals)-1 > 0 {
				prefix = "AND"
			}
			query += fmt.Sprintf(" %s %s %s $%d", prefix, qm["name"], qm["qtype"], len(vals))
		}
	}

	// Finally do something with the geoQuery if its there
	if val, ok := m["gq"]; ok {
		//if there is a geo component, add it to the query
		vl := len(vals)
		bounds := tools.UnmarshalMapBounds(val)
		query += fmt.Sprintf("%s ST_Contains(ST_MakeEnvelope($%d, $%d, $%d, $%d, 4326), geom) ",
			prefix, vl+1, vl+2, vl+3, vl+4)
		vals = append(vals, bounds.Southwest["lng"])
		vals = append(vals, bounds.Southwest["lat"])
		vals = append(vals, bounds.Northeast["lng"])
		vals = append(vals, bounds.Northeast["lat"])
	}
	return query, vals
}

func LakesHandler(w http.ResponseWriter, r *http.Request) {

	db := tools.GetDB()
	defer db.Close()

	rQ := tools.ParseQueryStr(r, lakesQueryMap)
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

	results := map[string]resources.LakeResource{}

	if err != nil {
		log.Print(err)
	}
	for rows.Next() {
		r := resources.LakeResource{}
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

// TODO: Since we are adding 2 more Geom Resources, we need to make this a little more generic
func GeomHandler(w http.ResponseWriter, r *http.Request) {
	db := tools.GetDB()
	defer db.Close()
	var rows *sql.Rows
	var err error
	var geomNameCol string = ""
	var geomTbl string = ""
	var gType string = ""

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	r.ParseForm()

	geoms := r.Form["g"] // a comma delimited list of geom ids

	if len(r.Form["t"]) != 0 {
		gType = r.Form["t"][0] // the type of geom l, r or ws ( lake, river, water shed )
	} else {
		gType = "l" //default to lakes
	}

	// get correct type from table
	switch gType {
	case "l":
		geomTbl = "lakes"
		geomNameCol = "name"
	case "r":
		geomTbl = "rivers_streams"
		geomNameCol = "name"
	case "ws":

		geomTbl = "water_sheds"
		geomNameCol = "local_name"
	default:
		geomTbl = "lakes"
		geomNameCol = "name"

	}

	results := []resources.GeomResource{}
	query := fmt.Sprintf("SELECT gid, COALESCE(%s,'No Name'), ST_AsGeoJSON(geom), ST_AsGeoJSON(ST_Centroid(geom)) as centroid FROM %s", geomNameCol, geomTbl)
	// default to showing all geoms in the collection
	if len(geoms) > 0 {
		query += fmt.Sprintf(" WHERE gid IN (%s)", strings.Join(geoms, ","))
	}

	rows, err = db.Query(query)
	defer rows.Close()
	for rows.Next() {
		g := resources.GeomResource{}
		if err := rows.Scan(&g.Gid, &g.Name, &g.Geom, &g.Centroid); err != nil {
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

// This is map of what GET params passed to the view represent
var accessQueryMap = map[string]map[string]string{
	"n":  tools.QueryType("name", "ILIKE"),    //name
	"wt": tools.QueryType("wat_ttp", "="),     // water type
	"t":  tools.QueryType("rstrctn", "ILIKE"), //we can infer trout stk from here
	"br": tools.QueryType("type", "ILIKE"),    //we can infer boat ramp from here by sear
}

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

func AccessHandler(w http.ResponseWriter, r *http.Request) {
	db := tools.GetDB()
	defer db.Close()

	rQ := tools.ParseQueryStr(r, accessQueryMap)
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

	results := []resources.AccessResource{}

	if err != nil {
		log.Print(err)
	}

	for rows.Next() {
		r := resources.AccessResource{}
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

func DamsHandler(w http.ResponseWriter, r *http.Request) {
	db := tools.GetDB()
	defer db.Close()

	var rows *sql.Rows
	var err error

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

    query := `SELECT gid, COALESCE(state_id, 'N/A'), COALESCE(name, 'No Name'), COALESCE(alt_name, 'N/A'), COALESCE(dam_type, 'UNKNOWN'), ST_AsGeoJSON(geom) as geom FROM dams`
	query += " ORDER BY name"

	rows, err = db.Query(query)
	defer rows.Close()

	results := []resources.DamResource{}

	if err != nil {
		log.Print(err)
	}

	for rows.Next() {
		r := resources.DamResource{}
		if err := rows.Scan(&r.Gid, &r.StateId, &r.Name, &r.AltName, &r.DamType, &r.Geom); err != nil {
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

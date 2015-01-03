package tools

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"encoding/json"
)

// Returns a map string of a name and the type of query to use
func QueryType(name string, qtype string) map[string]string {
	m := map[string]string{
		"name":  name,
		"qtype": qtype,
	}
	return m

}

// Parse http.Request and pull out GET params from query map. GET params with no value are ignored
func ParseQueryStr(r *http.Request, qm map[string]map[string]string) map[string]string {
	m := map[string]string{}
	for k, _ := range qm {
		v := r.FormValue(k)
		if v != "" {
			m[k] = v
		}
	}

	return m
}


type MapBounds struct {
	Southwest map[string]float64 `json:"_southWest"`
	Northeast map[string]float64 `json:"_northEast"`
}

func UnmarshalMapBounds(s string) MapBounds {
	i := MapBounds{}
	b := []byte(s)

	// Decode bytes b into interface i
	json.Unmarshal(b, &i)
	return i
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

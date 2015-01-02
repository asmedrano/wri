package resources

import (
	"database/sql"
	"encoding/json"
)

/* Resource for rivers_streams
                                   Table "public.rivers_streams"
  Column   |           Type            |                          Modifiers
-----------+---------------------------+--------------------------------------------------------------
 gid       | integer                   | not null default nextval('rivers_streams_gid_seq'::regclass)
 objectid  | numeric(10,0)             |
 name      | character varying(50)     |
 wbid      | character varying(60)     |
 strm_ordr | integer                   |

 srpw      | integer                   |
 cold      | character varying(4)      |
 rivmiles  | numeric                   |
 label     | character varying(18)     |
 wqs       | character varying(6)      |
 cat       | character varying(6)      |
 shape_len | numeric                   |
 geom      | geometry(MultiLineString) |
Indexes:
    "rivers_streams_pkey" PRIMARY KEY, btree (gid)
    "rivers_streams_geom_gist" gist (geom)
*/
type RiverResource struct {
	Gid       int64
	ObjectId  int64
	Name      string
	Wbid      string
	Strm_Ordr int64
	Srwp      int64
	Cold      string
	RivMiles  float64
	Label     string
	WQS       string
	Cat       string
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

type GeomResource struct {
	Gid      int64
	Name     string
	Geom     string
	Centroid string
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

func (a *AccessResource) MarshalJSON() ([]byte, error) {
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

/*
Fields for water sheds
   Table "public.water_sheds"
   Column   |          Type          |                         Modifiers
------------+------------------------+-----------------------------------------------------------
 gid        | integer                | not null default nextval('water_sheds_gid_seq'::regclass)
 huc_8      | character varying(8)   |
 huc_10     | character varying(10)  |
 huc_12     | character varying(12)  |
 acres      | numeric                |
 ncontrb_a  | numeric                |
 hu_10_gnis | character varying(23)  |
 hu_12_gnis | character varying(23)  |
 hu_10_ds   | character varying(10)  |
 hu_10_name | character varying(80)  |
 hu_10_mod  | character varying(20)  |
 hu_10_type | character varying(1)   |
 hu_12_ds   | character varying(12)  |
 hu_12_name | character varying(80)  |
 hu_12_mod  | character varying(20)  |
 hu_12_type | character varying(1)   |
 meta_id    | character varying(4)   |
 states     | character varying(20)  |
 local_name | character varying(85)  |
 geom       | geometry(MultiPolygon) |
Indexes:
    "water_sheds_pkey" PRIMARY KEY, btree (gid)
    "water_sheds_geom_gist" gist (geom)
*/

// Water Sheds are not queryable. They just aways appear on the map.

type WaterShedResource struct {
	Gid int64
	Name string // really this is local_name
}

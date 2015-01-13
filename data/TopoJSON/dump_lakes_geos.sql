DO $$DECLARE r record;
    STMT text;
BEGIN
  FOR r IN SELECT * FROM lakes LOOP
    BEGIN
        STMT := format('COPY (SELECT ST_AsGeoJSON(geom) FROM lakes WHERE gid=%s) TO ''/tmp/lakes/%s.json''', r.gid, r.gid);
        EXECUTE STMT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Loading of record % failed: %', r.gid, SQLERRM;
    END;
  END LOOP;
END$$;

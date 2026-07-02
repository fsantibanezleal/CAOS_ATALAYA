"""Chilean entity-key detection (pure python). Detection must require BOTH a header hint AND a value shape for
the strongly-typed keys, so free-text columns are not mistaken for join keys."""
from atalayalab.catalog import entities


def test_comuna_cut_detected():
    assert entities.detect_entity_role("cod_comuna", ["13101", "05101", "08301"]) == entities.COMUNA_CUT
    assert entities.detect_entity_role("CUT_COMUNA", ["13101", "16101"]) == entities.COMUNA_CUT


def test_year_detected_by_value_even_without_header():
    assert entities.detect_entity_role("periodo", ["2018", "2019", "2020"]) == entities.YEAR
    assert entities.detect_entity_role("random", ["2015", "2016", "2017"]) == entities.YEAR


def test_latlon_within_chile_band():
    assert entities.detect_entity_role("latitud", ["-33.4", "-36.8", "-53.1"]) == entities.LAT
    assert entities.detect_entity_role("lon", ["-70.6", "-73.0", "-70.9"]) == entities.LON
    # a latitude outside Chile's band is not accepted as the geo key
    assert entities.detect_entity_role("latitud", ["48.8", "51.5"]) == ""


def test_freetext_is_not_a_key():
    assert entities.detect_entity_role("descripcion", ["hola", "mundo", "texto"]) == ""


def test_region_and_comuna_name():
    assert entities.detect_entity_role("region", ["Metropolitana", "Biobío"]) == entities.REGION
    assert entities.detect_entity_role("nombre_comuna", ["Santiago", "Concepción"]) == entities.COMUNA_NAME

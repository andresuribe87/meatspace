import pytest

from meatspace_lab import cli


def test_version_and_help():
    with pytest.raises(SystemExit) as e:
        cli.main(["--version"])
    assert e.value.code == 0
    with pytest.raises(SystemExit) as e:
        cli.main(["report", "--help"])
    assert e.value.code == 0


def test_index_on_empty_dir(tmp_path):
    assert cli.main(["index", "--reports", str(tmp_path)]) == 0
    assert (tmp_path / "INDEX.md").read_text().startswith("# Twin Gap Report index")

# 일반 패키지로 둔다. __init__.py가 없으면 site-packages의 다른 `tests` 패키지(argostranslate·
# ultralytics 등이 잘못 설치한 것)가 이 폴더를 가려 `python -m unittest tests.test_x`가 PC마다 실패한다.

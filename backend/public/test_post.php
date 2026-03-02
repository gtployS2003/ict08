<?php
file_put_contents(__DIR__.'/test_post.txt',
"METHOD=".$_SERVER['REQUEST_METHOD']."\n".
"CONTENT_TYPE=".($_SERVER['CONTENT_TYPE'] ?? '')."\n".
"BODY=".file_get_contents('php://input')."\n\n",
FILE_APPEND);

http_response_code(200);
echo "OK";
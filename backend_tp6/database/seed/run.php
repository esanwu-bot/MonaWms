<?php
/**
 * MonaWMS 后台种子数据执行器
 *
 * 用法（在 backend_tp6 目录）：
 *   php database/seed/run.php            # 按顺序执行 seed 目录下全部 SQL
 *   php database/seed/run.php 03          # 仅执行文件名前缀匹配的 SQL
 *
 * 特性：
 *   - 所有种子 SQL 均为幂等设计，可重复执行
 *   - 单文件内语句放在同一事务中，出错回滚并提示
 */
require_once __DIR__ . '/../../vendor/autoload.php';

use think\facade\Db;

$app = new \think\App();
$app->initialize();

/**
 * 拆分 SQL：跳过行注释，识别字符串字面量中的分号
 */
function splitStatements(string $sql): array
{
    $lines = preg_split('/\R/u', $sql);
    $clean = [];
    foreach ($lines as $line) {
        $trim = ltrim($line);
        if ($trim === '' || strpos($trim, '--') === 0 || strpos($trim, '#') === 0) {
            continue;
        }
        $clean[] = $line;
    }

    $statements = [];
    $buffer = '';
    $quote = null;
    foreach ($clean as $line) {
        for ($i = 0, $len = strlen($line); $i < $len; $i++) {
            $ch = $line[$i];
            if ($quote !== null) {
                if ($ch === '\\' && $i + 1 < $len) {
                    $i++;
                    continue;
                }
                if ($ch === $quote) {
                    $quote = null;
                }
                $buffer .= $ch;
                continue;
            }
            if ($ch === "'" || $ch === '"' || $ch === '`') {
                $quote = $ch;
                $buffer .= $ch;
                continue;
            }
            if ($ch === ';') {
                if (trim($buffer) !== '') {
                    $statements[] = trim($buffer);
                }
                $buffer = '';
                continue;
            }
            $buffer .= $ch;
        }
        $buffer .= "\n";
    }
    if (trim($buffer) !== '') {
        $statements[] = trim($buffer);
    }
    return $statements;
}

$seedDir = __DIR__;
$filter = isset($argv[1]) ? $argv[1] : null;

$files = glob($seedDir . '/*.sql');
sort($files, SORT_NATURAL);

echo "=== MonaWMS 后台种子数据 ===\n";
echo '数据库：' . (env('database.database') ?: 'unknown') . "\n";

$started = microtime(true);
$total = 0;

foreach ($files as $file) {
    $name = basename($file);
    if ($filter !== null && strpos($name, $filter) !== 0) {
        continue;
    }

    echo "\n>>> {$name}\n";
    $statements = splitStatements(file_get_contents($file));

    Db::startTrans();
    try {
        $affected = 0;
        foreach ($statements as $statement) {
            $result = Db::execute($statement);
            $affected += is_int($result) ? $result : 0;
        }
        Db::commit();
        $total += $affected;
        echo "    完成：{$affected} 行受影响\n";
    } catch (\Throwable $e) {
        Db::rollback();
        echo '    失败：' . $e->getMessage() . "\n";
        echo "    SQL：\n" . implode(";\n", $statements) . ";\n";
        exit(1);
    }
}

printf("\n全部执行完成，共影响约 %d 行，耗时 %.2fs\n", $total, microtime(true) - $started);

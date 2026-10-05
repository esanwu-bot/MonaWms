package page

import "testing"

func TestNormalize(t *testing.T) {
	cases := []struct {
		name      string
		page      int
		limit     int
		wantPage  int
		wantLimit int
	}{
		{"零值走默认", 0, 0, DefaultPage, DefaultLimit},
		{"负数走默认", -3, -1, DefaultPage, DefaultLimit},
		{"limit 超出上限", 1, 100000, 1, MaxLimit},
		{"正常值保持不变", 2, 20, 2, 20},
	}

	for _, item := range cases {
		t.Run(item.name, func(t *testing.T) {
			got := Normalize(item.page, item.limit)
			if got.Page != item.wantPage || got.Limit != item.wantLimit {
				t.Fatalf("Normalize(%d,%d)=%+v, 期望 page=%d limit=%d",
					item.page, item.limit, got, item.wantPage, item.wantLimit)
			}
		})
	}
}

func TestOffset(t *testing.T) {
	if got := (Params{Page: 1, Limit: 15}).Offset(); got != 0 {
		t.Fatalf("首页偏移量应为 0，实际 %d", got)
	}
	if got := (Params{Page: 3, Limit: 20}).Offset(); got != 40 {
		t.Fatalf("第3页每页20条偏移应为 40，实际 %d", got)
	}
}

func TestPages(t *testing.T) {
	cases := []struct {
		total int64
		limit int
		want  int64
	}{
		{0, 15, 0},
		{1, 15, 1},
		{15, 15, 1},
		{16, 15, 2},
		{101, 10, 11},
		{10, 0, 1}, // limit 非法时回退默认值
	}
	for _, item := range cases {
		if got := Pages(item.total, item.limit); got != item.want {
			t.Fatalf("Pages(%d,%d)=%d, 期望 %d", item.total, item.limit, got, item.want)
		}
	}
}

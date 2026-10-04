package mipv4

import (
	"net"
	"sync"
)

var (
	// localIPv4 缓存本地 IPv4 地址。
	localIPv4 = ""
	// intranetIPv4Array 缓存内网 IPv4 地址数组。
	intranetIPv4Array []string
	intranetMu        sync.Mutex
	localMu           sync.Mutex
)

// GetIntranetIPArray 获取本地内网 IPv4 地址数组。
func GetIntranetIPArray() ([]string, error) {
	intranetMu.Lock()
	defer intranetMu.Unlock()
	if intranetIPv4Array != nil {
		return append([]string(nil), intranetIPv4Array...), nil
	}
	ips := make([]string, 0)
	// 获取所有网络接口
	interfaces, err := net.Interfaces()
	if err != nil {
		return ips, err
	}
	// 遍历所有网络接口
	for _, i := range interfaces {
		// 跳过未启用的接口
		if i.Flags&net.FlagUp == 0 {
			continue
		}
		// 获取接口地址
		addrs, err := i.Addrs()
		if err != nil {
			return ips, err
		}
		// 遍历所有地址
		for _, addr := range addrs {
			if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
				// 只处理 IPv4 地址
				if ipv4 := ipNet.IP.To4(); ipv4 != nil {
					ip := ipv4.String()
					if IsIntranet(ip) {
						ips = append(ips, ip)
					}
				}
			}
		}
	}
	intranetIPv4Array = ips
	return append([]string(nil), ips...), nil
}

// GetIPArray 获取本地全部 IPv4 地址数组。
func GetIPArray() ([]string, error) {
	ips := make([]string, 0)
	interfaces, err := net.Interfaces()
	if err != nil {
		return ips, err
	}
	for _, i := range interfaces {
		if i.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := i.Addrs()
		if err != nil {
			return ips, err
		}
		for _, addr := range addrs {
			if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
				if ipv4 := ipNet.IP.To4(); ipv4 != nil {
					ips = append(ips, ipv4.String())
				}
			}
		}
	}
	return ips, nil
}

// GetLocalIP 获取本地第一个 IPv4 地址。
func GetLocalIP() (string, error) {
	localMu.Lock()
	defer localMu.Unlock()
	if localIPv4 != "" {
		return localIPv4, nil
	}
	ips, err := GetIntranetIPArray()
	if err != nil {
		return "", err
	}
	if len(ips) > 0 {
		localIPv4 = ips[0]
		return localIPv4, nil
	}
	return "", nil
}

// IsIntranet 判断给定 IP 是否为内网 IP。
func IsIntranet(ip string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}
	return parsedIP.IsPrivate()
}

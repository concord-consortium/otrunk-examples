module Util
  
  def Util.toPlainText(xhtmlText)
    return Util.trim(xhtmlText.gsub(/<.*?>/, ''))
  end
  
  def Util.trim(s)
    return s.strip.gsub(/\s/, ' ').gsub(/ {2,}/, ' ')
  end
  
  def Util.truncate(string, length)
    if length < 3
      return '.' * length
    elsif string.length > length
      return string[0...(length-3)] + '...'
    else
      return string
    end
  end
  
  def Util.avg(list)
    list.inject(0) { |sum, e| sum + e } / list.length.to_f
  end
  
  def Util.error(message)
    System.err.println("#{self.class.name}: " + message)
  end
  
  def Util.log(message)
    System.out.println("#{self.class.name}: " + message)
  end
  
end

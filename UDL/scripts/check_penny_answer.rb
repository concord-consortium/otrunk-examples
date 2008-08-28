
DEBUG=true

eval Java::JavaLang::String.new($otrunk_ruby_script_tools.src).to_s
eval Java::JavaLang::String.new($label_range_response.src).to_s

# correct_range = { :range => 30.0..31.0, :axis => :y }

response_key = {
  :prompt => "Add a label to the graph showing where the penny was rubbed slowly. Then click the button below to check your answer.",
  :response_type => :label,
  :correct_range => { :range => 5..14, :axis => :x },
  :no_answer_entered => { :text => "Use the label tool to add a label to the graph!" },
  :correct => 
    { :text => "That's correct!\nNow you can move on to the next page", 
      :hightlight_region => false },
  :first_wrong_answer => 
    { :text => "Oops, that's not correct.\nWhere is the line going slowly upwards?" },
  :second_wrong_answer => 
    { :text => "Oops, that's not correct.\nThe area where the line is going slowly upwards in now marked.\nTry adding a label in that region.", 
      :hightlight_region => true },
  :multiple_wrong_answers => 
    { :text => "Oops, that's not correct.\nThe area where the line is going slowly upwards in now marked.\nTry adding a label in that region.", 
      :hightlight_region => true }
}

@label_range_response = LabelRangeResponse.new(response_key, $graph, $smart, $correct, $times_incorrect)

def self.clicked
  @label_range_response.clicked
end
